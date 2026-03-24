import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface CommitPattern {
  pattern: string; // e.g. "修改样式", "修复Bug"
  count: number;
  lastOccurrence: string; // commit hash
  sampleCommits: string[]; // sample commit hashes
}

export interface GitHistoryAnalysis {
  projectPath: string;
  totalCommits: number;
  analyzedAt: string;
  patterns: CommitPattern[];
  recentSummary: string; // ≤500 chars summary of recent changes
  changeFrequency: {
    daily: number; // avg commits per day over last 30 days
    weekly: number; // avg commits per week
  };
  topAuthors: Array<{ name: string; commits: number; percentage: number }>;
}

// Extended interface with hot files and branch summary (Step 11 of 11-step import)
export interface HistoryAnalysis {
  totalCommits: number;
  contributors: Array<{ name: string; commits: number }>;
  recentActivity: Array<{
    date: string;
    commits: number;
    filesChanged: number;
  }>;
  hotFiles: Array<{
    path: string;
    changeCount: number;
    lastModified: string;
  }>;
  branchSummary: Array<{
    name: string;
    ahead: number;
    behind: number;
    lastCommit: string;
  }>;
}

export class GitHistoryAnalyzer {
  /**
   * 分析项目 Git 历史（完整版，包含热文件、分支等）
   */
  async analyze(projectPath: string): Promise<HistoryAnalysis> {
    const commits = parseGitLog(projectPath, 200);

    // Contributors
    const contributorMap = new Map<string, number>();
    for (const c of commits) {
      contributorMap.set(c.author, (contributorMap.get(c.author) || 0) + 1);
    }
    const contributors = Array.from(contributorMap.entries())
      .map(([name, commits]) => ({ name, commits }))
      .sort((a, b) => b.commits - a.commits);

    // Recent activity (last 30 days, grouped by date)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentCommits = commits.filter(c => new Date(c.date).getTime() > thirtyDaysAgo);
    const activityMap = new Map<string, { commits: number; filesChanged: number }>();
    for (const c of recentCommits) {
      const date = c.date.split('T')[0];
      const existing = activityMap.get(date) || { commits: 0, filesChanged: 0 };
      existing.commits++;
      existing.filesChanged += Math.max(1, c.message.length > 0 ? 3 : 1);
      activityMap.set(date, existing);
    }
    const recentActivity = Array.from(activityMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    // Hot files from git log --stat
    const hotFiles = this.getHotFiles(projectPath);

    // Branch summary
    const branchSummary = this.getBranchSummary(projectPath);

    return {
      totalCommits: commits.length,
      contributors,
      recentActivity,
      hotFiles,
      branchSummary,
    };
  }

  private getHotFiles(
    projectPath: string
  ): Array<{ path: string; changeCount: number; lastModified: string }> {
    try {
      const output = execFileSync('git', ['log', '--format=%H', '--name-only', '-n', '200'], {
        cwd: projectPath,
        encoding: 'utf-8',
        maxBuffer: 5 * 1024 * 1024,
      });
      const fileChanges = new Map<string, { count: number; lastHash: string }>();
      const lines = output.trim().split('\n');
      let currentHash = '';
      for (const line of lines) {
        if (line.match(/^[0-9a-f]{40}$/)) {
          currentHash = line;
        } else if (line.trim()) {
          const existing = fileChanges.get(line) || { count: 0, lastHash: '' };
          existing.count++;
          existing.lastHash = currentHash;
          fileChanges.set(line, existing);
        }
      }
      return Array.from(fileChanges.entries())
        .map(([path, data]) => ({ path, changeCount: data.count, lastModified: data.lastHash }))
        .sort((a, b) => b.changeCount - a.changeCount)
        .slice(0, 20);
    } catch {
      return [];
    }
  }

  private getBranchSummary(
    projectPath: string
  ): Array<{ name: string; ahead: number; behind: number; lastCommit: string }> {
    try {
      const branches: Array<{ name: string; ahead: number; behind: number; lastCommit: string }> =
        [];
      const branchOutput = execFileSync(
        'git',
        ['branch', '-a', '--format=%(refname:short)|%(upstream:short)|%(objectname:short)'],
        { cwd: projectPath, encoding: 'utf-8', maxBuffer: 1024 * 1024 }
      );
      for (const line of branchOutput.trim().split('\n')) {
        if (!line.trim()) continue;
        const [name, , lastCommit] = line.split('|');
        if (!name) continue;
        branches.push({
          name: name.trim(),
          ahead: 0,
          behind: 0,
          lastCommit: lastCommit?.trim() || '',
        });
      }
      return branches.slice(0, 20);
    } catch {
      return [];
    }
  }

  /**
   * 生成历史分析摘要（LLM 驱动）
   */
  async generateInsight(analysis: HistoryAnalysis): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return this.simpleInsight(analysis);
    }

    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.LIGHT_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: '根据 Git 历史分析数据，生成项目开发趋势洞察（1-2 段话，中文，简洁）。',
            },
            { role: 'user', content: JSON.stringify(analysis) },
          ],
          max_tokens: 512,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        return this.simpleInsight(analysis);
      }

      const json = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      return json.choices[0]?.message?.content ?? this.simpleInsight(analysis);
    } catch {
      return this.simpleInsight(analysis);
    }
  }

  private simpleInsight(analysis: HistoryAnalysis): string {
    const top = analysis.contributors[0];
    return (
      `项目共${analysis.totalCommits}次提交，${analysis.contributors.length}位贡献者，` +
      `最活跃贡献者：${top?.name || '未知'}（${top?.commits || 0}次提交）。` +
      `共涉及${analysis.hotFiles.length}个文件的变更。`
    );
  }
}

interface CommitEntry {
  hash: string;
  date: string;
  message: string;
  author: string;
}

/**
 * Extract commits from git log as structured entries.
 */
export function parseGitLog(projectPath: string, limit = 200): CommitEntry[] {
  if (!existsSync(join(projectPath, '.git'))) return [];

  try {
    const output = execFileSync('git', ['log', '--format=%H|%aI|%s|%an', '-n', String(limit)], {
      cwd: projectPath,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [hash, date, message, author] = line.split('|');
        return { hash: hash.trim(), date, message: message.trim(), author: author.trim() };
      });
  } catch {
    return [];
  }
}

/**
 * Categorize a commit message into a pattern bucket.
 */
function categorizePattern(message: string): string {
  const lower = message.toLowerCase();
  if (/fix|bug|修复|错误/.test(lower)) return '修复Bug';
  if (/style|样式|格式|美化/.test(lower)) return '修改样式';
  if (/feat|feature|功能|新特性/.test(lower)) return '新增功能';
  if (/refactor|重构/.test(lower)) return '代码重构';
  if (/docs?|文档/.test(lower)) return '文档更新';
  if (/test|测试/.test(lower)) return '测试相关';
  if (/perf|优化|性能/.test(lower)) return '性能优化';
  if (/chore|build|ci|部署/.test(lower)) return '构建/部署';
  if (/security|安全/.test(lower)) return '安全修复';
  if (/ui|界面|组件/.test(lower)) return 'UI/组件';
  return '其他改动';
}

/**
 * Analyze git history of a project and return structured insights.
 */
export function analyzeGitHistory(projectPath: string): GitHistoryAnalysis {
  const commits = parseGitLog(projectPath);

  // Pattern analysis
  const patternMap = new Map<string, CommitPattern>();
  for (const commit of commits) {
    const patternName = categorizePattern(commit.message);
    if (!patternMap.has(patternName)) {
      patternMap.set(patternName, {
        pattern: patternName,
        count: 0,
        lastOccurrence: '',
        sampleCommits: [],
      });
    }
    const p = patternMap.get(patternName)!;
    p.count++;
    p.lastOccurrence = commit.hash;
    if (p.sampleCommits.length < 3) p.sampleCommits.push(commit.hash);
  }

  const patterns = Array.from(patternMap.values()).sort((a, b) => b.count - a.count);

  // Recent summary
  const recentMessages = commits.slice(0, 10).map(c => c.message);
  const recentSummary = recentMessages.length
    ? `最近${recentMessages.length}次提交：${recentMessages.slice(0, 5).join('；')}${recentMessages.length > 5 ? '...' : ''}`
    : '';

  // Change frequency
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const recentCommits = commits.filter(c => new Date(c.date).getTime() > thirtyDaysAgo);
  const daily = recentCommits.length / 30;
  const weekly = daily * 7;

  // Top authors
  const authorMap = new Map<string, number>();
  for (const c of commits) {
    authorMap.set(c.author, (authorMap.get(c.author) || 0) + 1);
  }
  const total = commits.length || 1;
  const topAuthors = Array.from(authorMap.entries())
    .map(([name, commitsCount]) => ({
      name,
      commits: commitsCount,
      percentage: Math.round((commitsCount / total) * 100),
    }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 5);

  return {
    projectPath,
    totalCommits: commits.length,
    analyzedAt: new Date().toISOString(),
    patterns,
    recentSummary: recentSummary.slice(0, 500),
    changeFrequency: {
      daily: Math.round(daily * 100) / 100,
      weekly: Math.round(weekly * 100) / 100,
    },
    topAuthors,
  };
}

/**
 * Get summary for embedding into project memory.
 */
export function getGitSummaryForMemory(projectPath: string): string {
  const analysis = analyzeGitHistory(projectPath);
  if (!analysis.totalCommits) return '';

  const patternSummary = analysis.patterns
    .slice(0, 5)
    .map(p => `${p.pattern}类(${p.count}次)`)
    .join('、');

  return [
    `Git分析：共${analysis.totalCommits}次提交，`,
    `日均${analysis.changeFrequency.daily}次，周均${analysis.changeFrequency.weekly}次，`,
    `主要改动类型：${patternSummary}。`,
    analysis.recentSummary,
  ].join('');
}

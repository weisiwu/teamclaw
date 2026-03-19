import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface CommitPattern {
  pattern: string;         // e.g. "修改样式", "修复Bug"
  count: number;
  lastOccurrence: string; // commit hash
  sampleCommits: string[]; // sample commit hashes
}

export interface GitHistoryAnalysis {
  projectPath: string;
  totalCommits: number;
  analyzedAt: string;
  patterns: CommitPattern[];
  recentSummary: string;  // ≤500 chars summary of recent changes
  changeFrequency: {
    daily: number;        // avg commits per day over last 30 days
    weekly: number;       // avg commits per week
  };
  topAuthors: Array<{ name: string; commits: number; percentage: number }>;
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
function parseGitLog(projectPath: string, limit = 200): CommitEntry[] {
  if (!existsSync(join(projectPath, '.git'))) return [];

  try {
    const output = execSync(
      `git log --format="%H|%aI|%s|%an" -n ${limit}`,
      { cwd: projectPath, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    return output.trim().split('\n').filter(Boolean).map(line => {
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

  const patterns = Array.from(patternMap.values())
    .sort((a, b) => b.count - a.count);

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
    .map(([name, commits: number]) => ({ name, commits, percentage: Math.round((commits / total) * 100) }))
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

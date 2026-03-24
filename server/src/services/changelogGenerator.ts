/**
 * Changelog Generator — Call AI model to generate structured changelog
 * Supports AI-powered generation and rule-based fallback
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { getGitLog } from './gitService.js';
import os from 'os';

interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  files?: string[];
}

interface GeneratedChangelog {
  title: string;
  content: string;
  features: string[];
  fixes: string[];
  improvements: string[];
  breaking: string[];
  docs: string[];
}

async function callAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    throw new Error('No AI API key configured');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.MEDIUM_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a senior software architect. Analyze commit messages and produce a structured changelog.
Output valid JSON with this exact schema:
{
  "title": "brief version title in Chinese",
  "content": "1-2 paragraph overview in Chinese",
  "features": ["list of new features"],
  "fixes": ["list of bug fixes"],
  "improvements": ["list of improvements"],
  "breaking": ["list of breaking changes"],
  "docs": ["list of documentation updates"]
}`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2048,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return json.choices[0]?.message?.content ?? '';
}

function parseCommits(commitText: string): CommitInfo[] {
  // Parse conventional commit format
  const lines = commitText.split('\n').filter(Boolean);
  const commits: CommitInfo[] = [];

  for (const line of lines) {
    const match = line.match(/^([a-f0-9]+)\s+(.+?)(?:\s+\((.+?)\))?$/);
    if (match) {
      commits.push({
        hash: match[1].slice(0, 7),
        message: match[2],
        author: match[3] || 'unknown',
        date: new Date().toISOString(),
      });
    } else {
      commits.push({
        hash: '',
        message: line,
        author: 'unknown',
        date: new Date().toISOString(),
      });
    }
  }

  return commits;
}

function classifyCommit(message: string): string[] {
  const types: string[] = [];
  const lower = message.toLowerCase();

  if (/\bfeat|feature|新增|新增功能|新功能\b/.test(lower)) types.push('feature');
  else if (/\bfix|bug|修复|修正|bugfix\b/.test(lower)) types.push('fix');
  else if (/\bimprove|优化|增强|提升|improvement\b/.test(lower)) types.push('improvement');
  else if (/\bbreak|破坏|breaking\b/.test(lower)) types.push('breaking');
  else if (/\bdoc|文档|docs\b/.test(lower)) types.push('docs');

  return types.length ? types : ['improvement'];
}

function extractDescription(message: string): string {
  // Remove conventional prefix like feat:, fix:, etc.
  return message.replace(/^[a-z]+(\([^)]+\))?:\s*/i, '').trim();
}

export async function generateChangelogFromCommits(
  versionId: string,
  commitText: string,
  branchName?: string
): Promise<GeneratedChangelog> {
  const commits = parseCommits(commitText);

  if (commits.length === 0 || !commits[0].message) {
    return {
      title: `${versionId} 版本更新`,
      content: `版本 ${versionId} 包含多项代码更新和改进。`,
      features: [],
      fixes: [],
      improvements: ['代码优化和重构'],
      breaking: [],
      docs: [],
    };
  }

  const commitList = commits.map(c => `- ${c.hash || '*'} ${c.message}`).join('\n');

  const prompt = `为以下提交记录生成结构化变更日志：

版本: ${versionId}
分支: ${branchName || 'main'}
提交记录:
${commitList}

请生成 JSON 格式的变更日志。`;

  try {
    const raw = await callAI(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as GeneratedChangelog;
      return {
        ...parsed,
        improvements: parsed.improvements || [],
      };
    }
  } catch (err) {
    console.warn('AI changelog generation failed, using fallback:', err);
  }

  // Fallback: rule-based classification
  const features: string[] = [];
  const fixes: string[] = [];
  const improvements: string[] = [];
  const breaking: string[] = [];
  const docs: string[] = [];

  for (const commit of commits) {
    const types = classifyCommit(commit.message);
    const desc = extractDescription(commit.message);

    if (desc) {
      for (const type of types) {
        if (type === 'feature') features.push(desc);
        else if (type === 'fix') fixes.push(desc);
        else if (type === 'improvement') improvements.push(desc);
        else if (type === 'breaking') breaking.push(desc);
        else if (type === 'docs') docs.push(desc);
      }
      // Default to improvement if no type matched
      if (types.length === 0) improvements.push(desc);
    }
  }

  return {
    title: `${versionId} 版本更新`,
    content:
      [
        features.length > 0 ? `新增 ${features.length} 项功能` : '',
        fixes.length > 0 ? `修复 ${fixes.length} 个问题` : '',
        improvements.length > 0 ? `${improvements.length} 项优化` : '',
      ]
        .filter(Boolean)
        .join('；') || `${versionId} 包含多项更新`,
    features: [...new Set(features)],
    fixes: [...new Set(fixes)],
    improvements: [...new Set(improvements)],
    breaking: [...new Set(breaking)],
    docs: [...new Set(docs)],
  };
}

/**
 * Generate AI-powered changelog for a version directly from git commits
 * Fetches commits from the project path and generates structured changelog
 */
export async function generateAIChangelog(
  versionId: string,
  options: {
    projectPath?: string;
    maxCommits?: number;
    branch?: string;
  } = {}
): Promise<GeneratedChangelog> {
  const projectPath =
    options.projectPath ||
    join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', versionId);

  const maxCommits = options.maxCommits || 30;

  if (!existsSync(join(projectPath, '.git'))) {
    return {
      title: `${versionId} 版本`,
      content: `版本 ${versionId} 的变更日志。`,
      features: [],
      fixes: [],
      improvements: [],
      breaking: [],
      docs: [],
    };
  }

  try {
    const commits = getGitLog(projectPath, { maxCount: maxCommits, branch: options.branch });
    const commitText = commits.map(c => `${c.hash.slice(0, 7)} ${c.message}`).join('\n');

    return await generateChangelogFromCommits(versionId, commitText, options.branch);
  } catch (err) {
    console.warn('generateAIChangelog failed:', err);
    return {
      title: `${versionId} 版本`,
      content: `版本 ${versionId} 的变更日志生成失败。`,
      features: [],
      fixes: [],
      improvements: [],
      breaking: [],
      docs: [],
    };
  }
}

/**
 * Generate a markdown-formatted changelog from a GeneratedChangelog
 */
export function formatChangelogAsMarkdown(changelog: GeneratedChangelog, version: string): string {
  const lines: string[] = [`## ${version} ${changelog.title}`, '', changelog.content, ''];

  if (changelog.features.length > 0) {
    lines.push('### ✨ 新功能', '');
    changelog.features.forEach(f => lines.push(`- ${f}`));
    lines.push('');
  }

  if (changelog.improvements.length > 0) {
    lines.push('### ⚡ 优化改进', '');
    changelog.improvements.forEach(i => lines.push(`- ${i}`));
    lines.push('');
  }

  if (changelog.fixes.length > 0) {
    lines.push('### 🐛 Bug 修复', '');
    changelog.fixes.forEach(f => lines.push(`- ${f}`));
    lines.push('');
  }

  if (changelog.breaking.length > 0) {
    lines.push('### ⚠️ 破坏性变更', '');
    changelog.breaking.forEach(b => lines.push(`- ${b}`));
    lines.push('');
  }

  if (changelog.docs.length > 0) {
    lines.push('### 📝 文档更新', '');
    changelog.docs.forEach(d => lines.push(`- ${d}`));
    lines.push('');
  }

  return lines.join('\n');
}

// Facade for backward-compatible imports
export const changelogGenerator = {
  generateAIChangelog,
  formatChangelogAsMarkdown,
};

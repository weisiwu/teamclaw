import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const VERSIONS_BASE_DIR = path.join(process.env.HOME || '/root', '.openclaw/versions');

export interface CommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  subject: string;
  body: string;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

export interface ChangeTrackerResult {
  versionTag: string;
  generatedAt: string;
  markdown: string;
  commitCount: number;
  fileChanges: FileChange[];
  summary: {
    features: string[];
    fixes: string[];
    improvements: string[];
    technical: string[];
  };
  screenshots: string[];
}

/**
 * Parse git log into structured commit info
 */
export function parseGitLog(gitLogOutput: string): CommitInfo[] {
  const commits: CommitInfo[] = [];
  const commitBlocks = gitLogOutput.split(/^={20,}$/m).filter(Boolean);

  for (const block of commitBlocks) {
    const lines = block.trim().split('\n').filter(Boolean);
    if (lines.length < 2) continue;

    const hashLine = lines[0] || '';
    const metaLine = lines[1] || '';
    const body = lines.slice(2).join('\n').trim();

    const hashMatch = hashLine.match(/^([a-f0-9]+)/);
    const metaMatch = metaLine.match(/^(.+?)\s{2,}(.+?)\s{2,}(.+)$/);
    const subjectMatch = body.split('\n').find(l => !l.startsWith(' ') && l.length > 0);

    if (hashMatch) {
      commits.push({
        hash: hashMatch[1],
        shortHash: hashMatch[1].substring(0, 7),
        author: metaMatch?.[1]?.trim() ?? 'unknown',
        date: metaMatch?.[2]?.trim() ?? '',
        subject: subjectMatch ?? '',
        body
      });
    }
  }
  return commits;
}

/**
 * Get file changes between commits or for a tag
 */
export function getFileChanges(repoPath: string, fromRef: string, toRef: string = 'HEAD'): FileChange[] {
  try {
    const output = execSync(
      `git diff --numstat ${fromRef}..${toRef}`,
      { cwd: repoPath, encoding: 'utf-8', timeout: 10000 }
    );

    return output.trim().split('\n').filter(Boolean).map(line => {
      const [additions, deletions, ...pathParts] = line.split('\t');
      const filePath = pathParts.join('\t');

      return {
        path: filePath,
        status: fs.existsSync(path.join(repoPath, filePath)) ? 'modified' : 'deleted',
        additions: parseInt(additions, 10) || 0,
        deletions: parseInt(deletions, 10) || 0
      } as FileChange;
    });
  } catch {
    return [];
  }
}

/**
 * Detect commit category from message
 */
function categorizeCommit(commit: CommitInfo): 'feature' | 'fix' | 'improvement' | 'technical' {
  const lower = commit.subject.toLowerCase();
  if (lower.includes('fix') || lower.includes('bug') || lower.includes('patch')) return 'fix';
  if (lower.includes('feat') || lower.includes('add') || lower.includes('new:')) return 'feature';
  if (lower.includes('improv') || lower.includes('optim') || lower.includes('refactor')) return 'improvement';
  return 'technical';
}

/**
 * Generate version changelog markdown
 */
export function generateChangelogMarkdown(
  versionTag: string,
  commits: CommitInfo[],
  fileChanges: FileChange[],
  relatedTasks: string[] = []
): string {
  const categorized = {
    features: commits.filter(c => categorizeCommit(c) === 'feature'),
    fixes: commits.filter(c => categorizeCommit(c) === 'fix'),
    improvements: commits.filter(c => categorizeCommit(c) === 'improvement'),
    technical: commits.filter(c => categorizeCommit(c) === 'technical')
  };

  const totalAdditions = fileChanges.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = fileChanges.reduce((s, f) => s + f.deletions, 0);

  let md = `# ${versionTag} 变更摘要\n\n`;
  md += `> 生成时间：${new Date().toISOString()} | ${commits.length} 个提交 | +${totalAdditions} -${totalDeletions}\n\n`;

  if (relatedTasks.length > 0) {
    md += `## 关联任务\n${relatedTasks.map(t => `- ${t}`).join('\n')}\n\n`;
  }

  if (categorized.features.length > 0) {
    md += `## ✨ 新功能\n`;
    for (const c of categorized.features) {
      md += `- ${c.subject} (${c.shortHash})\n`;
    }
    md += '\n';
  }

  if (categorized.fixes.length > 0) {
    md += `## 🐛 Bug 修复\n`;
    for (const c of categorized.fixes) {
      md += `- ${c.subject} (${c.shortHash})\n`;
    }
    md += '\n';
  }

  if (categorized.improvements.length > 0) {
    md += `## 🚀 改进优化\n`;
    for (const c of categorized.improvements) {
      md += `- ${c.subject} (${c.shortHash})\n`;
    }
    md += '\n';
  }

  if (categorized.technical.length > 0) {
    md += `## 🔧 技术改动\n`;
    for (const c of categorized.technical) {
      md += `- ${c.subject} (${c.shortHash})\n`;
    }
    md += '\n';
  }

  const changedFiles = fileChanges.filter(f => f.status !== 'deleted');
  if (changedFiles.length > 0) {
    md += `## 📁 改动文件 (${changedFiles.length})\n`;
    for (const f of changedFiles.slice(0, 20)) {
      md += `- ${f.path} (+${f.additions} -${f.deletions})\n`;
    }
    if (changedFiles.length > 20) {
      md += `- ...还有 ${changedFiles.length - 20} 个文件\n`;
    }
    md += '\n';
  }

  return md;
}

/**
 * Generate version changelog for a specific tag
 */
export async function generateVersionChangelog(
  repoPath: string,
  versionTag: string,
  relatedTasks: string[] = []
): Promise<ChangeTrackerResult> {
  let commits: CommitInfo[] = [];
  let fileChanges: FileChange[] = [];

  try {
    // Get commits since last tag
    const lastTagRef = execSync(
      `git rev-list --tags-order-by-version --max-count=1 --exclude=${versionTag} HEAD~10..HEAD 2>/dev/null | tail -1 || echo ''`,
      { cwd: repoPath, encoding: 'utf-8', timeout: 10000 }
    ).trim();

    const range = lastTagRef ? `${lastTagRef}..${versionTag}` : `${versionTag}~10..${versionTag}`;

    const logOutput = execSync(
      `git log ${range} --pretty=format:"%H%n%an  %ae  %ad%n%s%n%b" --date=iso`,
      { cwd: repoPath, encoding: 'utf-8', timeout: 10000 }
    );
    commits = parseGitLog(logOutput as string);

    fileChanges = getFileChanges(repoPath, lastTagRef || `${versionTag}~10`, versionTag);
  } catch {
    // Fallback: try to get log for this tag specifically
    try {
      const logOutput = execSync(
        `git log ${versionTag}~5..${versionTag} --pretty=format:"%H%n%an  %ae  %ad%n%s%n%b" --date=iso`,
        { cwd: repoPath, encoding: 'utf-8', timeout: 10000 }
      );
      commits = parseGitLog(logOutput as string);
    } catch {
      // No commits found
    }
  }

  const categorized = {
    features: commits.filter(c => categorizeCommit(c) === 'feature'),
    fixes: commits.filter(c => categorizeCommit(c) === 'fix'),
    improvements: commits.filter(c => categorizeCommit(c) === 'improvement'),
    technical: commits.filter(c => categorizeCommit(c) === 'technical')
  };

  const markdown = generateChangelogMarkdown(versionTag, commits, fileChanges, relatedTasks);

  // Save screenshots directory path
  const screenshotsDir = path.join(VERSIONS_BASE_DIR, versionTag, 'screenshots');
  let screenshots: string[] = [];
  try {
    if (fs.existsSync(screenshotsDir)) {
      screenshots = fs.readdirSync(screenshotsDir)
        .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
        .map(f => path.join(screenshotsDir, f));
    }
  } catch {
    // ignore
  }

  return {
    versionTag,
    generatedAt: new Date().toISOString(),
    markdown,
    commitCount: commits.length,
    fileChanges,
    summary: categorized,
    screenshots
  };
}

/**
 * Save changelog to disk
 */
export function saveChangelog(versionTag: string, markdown: string): string {
  const dir = path.join(VERSIONS_BASE_DIR, versionTag);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'summary.md');
  fs.writeFileSync(filePath, markdown, 'utf-8');
  return filePath;
}

/**
 * Load saved changelog
 */
export function loadChangelog(versionTag: string): string | null {
  const filePath = path.join(VERSIONS_BASE_DIR, versionTag, 'summary.md');
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch {
    // ignore
  }
  return null;
}

// =============================================================================
// Version Change Events — event tracking for the version timeline
// =============================================================================

import { getDb } from '../db/sqlite.js';
import type { ChangeEventType } from '../models/versionChangeEvent.js';

export interface TimelineEvent {
  id: string;
  type: ChangeEventType;
  title: string;
  description?: string;
  actor: string;
  timestamp: string;
  screenshotId?: string;
  screenshot?: {
    id: string;
    url: string;
    thumbnailUrl?: string;
    messageContent?: string;
    senderName?: string;
  };
  changelog?: {
    features: string[];
    fixes: string[];
    improvements: string[];
    breaking: string[];
    docs: string[];
  };
}

// ========== Simple In-Memory Pub/Sub for SSE (iter-49) ==========
type Subscriber = (event: { versionId: string; event: TimelineEvent }) => void;
const subscribers = new Map<string, Set<Subscriber>>();

export function subscribe(versionId: string, callback: Subscriber): () => void {
  if (!subscribers.has(versionId)) {
    subscribers.set(versionId, new Set());
  }
  subscribers.get(versionId)!.add(callback);
  return () => {
    subscribers.get(versionId)?.delete(callback);
    if (subscribers.get(versionId)?.size === 0) {
      subscribers.delete(versionId);
    }
  };
}

export function getSubscriberCount(versionId: string): number {
  return subscribers.get(versionId)?.size ?? 0;
}

function makeEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Record a version change event
 */
export function recordChangeEvent(data: {
  versionId: string;
  type: ChangeEventType;
  title: string;
  description?: string;
  actor?: string;
  actorId?: string;
  screenshotId?: string;
  changelogId?: string;
  buildId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}): string {
  const db = getDb();
  const id = makeEventId();
  db.prepare(`
    INSERT INTO version_change_events (
      id, version_id, event_type, title, description,
      actor, actor_id, screenshot_id, changelog_id, build_id, task_id, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.versionId,
    data.type,
    data.title,
    data.description ?? null,
    data.actor ?? 'system',
    data.actorId ?? null,
    data.screenshotId ?? null,
    data.changelogId ?? null,
    data.buildId ?? null,
    data.taskId ?? null,
    data.metadata ? JSON.stringify(data.metadata) : null
  );

  // Publish to SSE subscribers (iter-49)
  const event: TimelineEvent = {
    id,
    type: data.type,
    title: data.title,
    description: data.description,
    actor: data.actor ?? 'system',
    timestamp: new Date().toISOString(),
    screenshotId: data.screenshotId,
    changelog: data.changelogId ? { features: [], fixes: [], improvements: [], breaking: [], docs: [] } : undefined,
  };
  const subs = subscribers.get(data.versionId);
  if (subs) {
    for (const cb of subs) {
      try { cb({ versionId: data.versionId, event }); } catch { /* ignore subscriber errors */ }
    }
  }

  return id;
}

/**
 * Get the full timeline for a version
 */
export function getVersionTimeline(versionId: string): TimelineEvent[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      e.*,
      s.screenshot_url,
      s.message_content,
      s.sender_name,
      s.thumbnail_url,
      c.features,
      c.fixes,
      c.improvements,
      c.breaking,
      c.docs
    FROM version_change_events e
    LEFT JOIN screenshots s ON e.screenshot_id = s.id
    LEFT JOIN version_changelog_entries c ON e.changelog_id = c.id
    WHERE e.version_id = ?
    ORDER BY e.created_at DESC
  `).all(versionId) as Array<{
    id: string;
    event_type: string;
    title: string;
    description: string | null;
    actor: string;
    created_at: string;
    screenshot_id: string | null;
    screenshot_url: string | null;
    message_content: string | null;
    sender_name: string | null;
    thumbnail_url: string | null;
    changelog_id: string | null;
    metadata: string | null;
    features: string | null;
    fixes: string | null;
    improvements: string | null;
    breaking: string | null;
    docs: string | null;
  }>;

  return rows.map(row => ({
    id: row.id,
    type: row.event_type as ChangeEventType,
    title: row.title,
    description: row.description ?? undefined,
    actor: row.actor,
    timestamp: row.created_at,
    screenshotId: row.screenshot_id ?? undefined,
    changelogId: row.changelog_id ?? undefined,
    screenshot: row.screenshot_id ? {
      id: row.screenshot_id,
      url: row.screenshot_url!,
      thumbnailUrl: row.thumbnail_url ?? undefined,
      messageContent: row.message_content ?? undefined,
      senderName: row.sender_name ?? undefined,
    } : undefined,
    changelog: row.changelog_id ? {
      features: row.features ? JSON.parse(row.features) : [],
      fixes: row.fixes ? JSON.parse(row.fixes) : [],
      improvements: row.improvements ? JSON.parse(row.improvements) : [],
      breaking: row.breaking ? JSON.parse(row.breaking) : [],
      docs: row.docs ? JSON.parse(row.docs) : [],
    } : undefined,
  }));
}

/**
 * Hook: called when a version is created
 */
export function onVersionCreated(versionId: string, actor: string, actorId?: string): string {
  return recordChangeEvent({
    versionId,
    type: 'version_created',
    title: '版本创建',
    description: `版本已创建`,
    actor,
    actorId,
  });
}

/**
 * Hook: called when a screenshot is linked to a version
 */
export function onScreenshotLinked(
  versionId: string,
  screenshotId: string,
  actor: string,
  actorId?: string
): string {
  return recordChangeEvent({
    versionId,
    type: 'screenshot_linked',
    title: '关联消息截图',
    description: '关联消息截图记录',
    actor,
    actorId,
    screenshotId,
  });
}

/**
 * Hook: called when a changelog is generated
 */
export function onChangelogGenerated(
  versionId: string,
  changelogId: string,
  entryCount: number,
  actor: string = 'ai'
): string {
  return recordChangeEvent({
    versionId,
    type: 'changelog_generated',
    title: '变更摘要生成',
    description: `基于 ${entryCount} 个条目生成变更摘要`,
    actor,
    changelogId,
  });
}

/**
 * Hook: called when a manual note is added
 */
export function onManualNote(
  versionId: string,
  note: string,
  actor: string,
  actorId?: string
): string {
  return recordChangeEvent({
    versionId,
    type: 'manual_note',
    title: '添加备注',
    description: note,
    actor,
    actorId,
  });
}

/**
 * Hook: called when a version rollback is performed
 */
export function onVersionRollback(
  versionId: string,
  targetRef: string,
  targetType: 'tag' | 'branch' | 'commit',
  actor: string,
  actorId?: string,
  metadata?: Record<string, unknown>
): string {
  return recordChangeEvent({
    versionId,
    type: 'version_rollback',
    title: '版本回退',
    description: `回退到 ${targetType}：${targetRef}`,
    actor,
    actorId,
    metadata: {
      targetRef,
      targetType,
      ...metadata,
    },
  });
}

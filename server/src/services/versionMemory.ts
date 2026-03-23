/**
 * Version Memory Service — Version summary vectorization and semantic search
 * Stores version summaries in ChromaDB for natural language retrieval
 * Integrates with versionVectorStore for storage/query
 */

import {
  storeVersionVector,
  searchSimilarVersions,
  deleteVersionVector,
} from './versionVectorStore.js';
import { getGitLog } from './gitService.js';
import { existsSync } from 'fs';
import { join } from 'path';
import os from 'os';

export interface VersionMemoryEntry {
  versionId: string;
  versionTag: string;
  summary: string;
  commits: string[];
  relatedTasks: string[];
  createdAt: string;
  tokenUsed: number;
}

export interface SemanticSearchResult {
  versionId: string;
  versionTag: string;
  summary: string;
  createdAt: string;
  similarity: number;
  relevanceLabel: 'high' | 'medium' | 'low';
}

/**
 * Generate version summary text for vector storage
 */
async function generateVersionSummaryText(
  projectPath: string,
  versionTag: string,
  maxCommits = 20
): Promise<{ summary: string; commits: string[] }> {
  if (!existsSync(join(projectPath, '.git'))) {
    return { summary: `Version ${versionTag}`, commits: [] };
  }

  try {
    const commits = getGitLog(projectPath, { maxCount: maxCommits, branch: versionTag });
    const commitMessages = commits.map(c => c.message);

    const summaryParts: string[] = [`版本 ${versionTag}`];

    // Classify commits by type
    const features = commitMessages.filter(m => /\b(feat|feature|新增|新功能)\b/i.test(m));
    const fixes = commitMessages.filter(m => /\b(fix|bug|修复)\b/i.test(m));
    const improvements = commitMessages.filter(m =>
      /\b(improve|optimize|refactor|优化|重构)\b/i.test(m)
    );

    if (features.length > 0) summaryParts.push(`新功能: ${features.slice(0, 3).join('; ')}`);
    if (fixes.length > 0) summaryParts.push(`修复: ${fixes.slice(0, 3).join('; ')}`);
    if (improvements.length > 0) summaryParts.push(`优化: ${improvements.slice(0, 3).join('; ')}`);

    if (summaryParts.length === 1) {
      summaryParts.push(`更新内容: ${commitMessages.slice(0, 5).join('; ')}`);
    }

    return {
      summary: summaryParts.join(' | '),
      commits: commitMessages,
    };
  } catch {
    return { summary: `Version ${versionTag}`, commits: [] };
  }
}

/**
 * Store a version's summary in the vector database
 */
export async function storeVersionMemory(
  versionId: string,
  versionTag: string,
  options: {
    projectPath?: string;
    customSummary?: string;
    relatedTasks?: string[];
  } = {}
): Promise<void> {
  const projectPath =
    options.projectPath ||
    join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', versionId);

  const { summary: autoSummary, commits } = await generateVersionSummaryText(
    projectPath,
    versionTag
  );
  const summary = options.customSummary || autoSummary;

  await storeVersionVector({
    versionId,
    versionTag,
    summary,
    commits,
    relatedTasks: options.relatedTasks || [],
    createdAt: new Date().toISOString(),
    tokenUsed: 0,
  });
}

/**
 * Search for similar versions using natural language query
 */
export async function searchVersionMemory(
  query: string,
  options: {
    topK?: number;
    minSimilarity?: number;
  } = {}
): Promise<SemanticSearchResult[]> {
  const { topK = 5, minSimilarity = 0.3 } = options;

  const results = await searchSimilarVersions(query, topK);

  return results
    .filter(r => r.similarity >= minSimilarity)
    .map(r => ({
      versionId: r.versionId,
      versionTag: r.versionTag,
      summary: r.summary,
      createdAt: r.createdAt,
      similarity: r.similarity,
      relevanceLabel: r.similarity >= 0.7 ? 'high' : r.similarity >= 0.5 ? 'medium' : 'low',
    }));
}

/**
 * Delete a version's memory from the vector store
 */
export async function deleteVersionMemory(versionId: string): Promise<void> {
  await deleteVersionVector(versionId);
}

/**
 * Get a text description of what changed in a version
 */
export async function getVersionMemoryContext(
  versionId: string,
  versionTag: string,
  projectPath?: string
): Promise<string> {
  const path =
    projectPath ||
    join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', versionId);

  const { summary, commits } = await generateVersionSummaryText(path, versionTag);

  if (commits.length === 0) return summary;

  return `${summary}

相关提交:
${commits
  .slice(0, 10)
  .map(c => `- ${c}`)
  .join('\n')}`;
}

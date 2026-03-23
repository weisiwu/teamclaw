import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE, delay, autoBumpVersion } from "./versionShared";
import {
  Version,
  VersionChangelog,
  ChangelogResponse,
  GenerateChangelogRequest,
  ChangelogChange,
  VersionSummary,
  VersionSummaryVector,
  VectorSearchResult,
  SimilarVersion,
  VersionUpgradeConfig,
  UpgradeHistoryRecord,
  UpgradePreview,
  TimelineEvent,
  TimelineResponse,
  VersionBumpType,
} from "./types";

// ========== Mock 变更摘要数据 ==========
const mockChangelogs: VersionChangelog[] = [
  {
    id: "cl-1",
    versionId: "v1",
    title: "v1.0.0 变更日志",
    content: "初始版本发布，包含核心功能",
    changes: [
      { type: "feature", description: "任务管理基础功能", files: ["app/tasks/page.tsx", "lib/api/tasks.ts"] },
      { type: "feature", description: "用户认证系统", files: ["app/auth/page.tsx", "lib/auth.ts"] },
      { type: "improvement", description: "优化页面加载性能", files: [] },
    ],
    generatedAt: "2026-01-15T10:00:00Z",
    generatedBy: "system",
  },
  {
    id: "cl-2",
    versionId: "v2",
    title: "v1.1.0 变更日志",
    content: "任务管理增强版本",
    changes: [
      { type: "feature", description: "新增任务筛选功能", files: ["components/TaskFilter.tsx"] },
      { type: "feature", description: "新增任务排序功能", files: ["components/TaskSort.tsx"] },
      { type: "fix", description: "修复任务详情页加载慢的问题", files: ["app/tasks/[id]/page.tsx"] },
    ],
    generatedAt: "2026-02-01T14:30:00Z",
    generatedBy: "system",
  },
];

// ========== Mock 升级配置数据 ==========
const mockUpgradeConfigs: VersionUpgradeConfig[] = [];
const mockUpgradeHistory: UpgradeHistoryRecord[] = [];

// ========== 版本向量搜索 API ==========

const VECTOR_STORAGE_KEY = 'teamclaw_version_vectors';
const SUMMARY_STORAGE_KEY = 'teamclaw_version_summaries';

// 生成版本摘要文本
export function generateVersionSummary(version: Version): string {
  const parts = [
    version.version,
    version.title,
    version.description || '',
    ...version.tags,
    ...version.changedFiles,
  ];
  return parts.filter(Boolean).join(' ');
}

// ========== LLM 版本摘要生成 ==========
export async function generateVersionSummaryLLM(version: Version): Promise<VersionSummary> {
  return {
    versionId: version.id,
    title: version.title || version.version,
    content: buildVersionText(version),
    features: extractFeatures(version),
    changes: [],
    fixes: [],
    breaking: [],
    text: buildVersionText(version),
    generatedAt: new Date().toISOString(),
  };
}

function buildVersionText(version: Version): string {
  const parts = [version.version];
  if (version.title) parts.push(version.title);
  if (version.description) parts.push(version.description);
  if (version.gitTag) parts.push(`Tag: ${version.gitTag}`);
  if (version.tags.length > 0) parts.push(`标签: ${version.tags.join(', ')}`);
  parts.push(`变更文件: ${version.changedFiles.length} 个`);
  parts.push(`提交: ${version.commitCount} 次`);
  return parts.join(' | ');
}

function extractFeatures(version: Version): string[] {
  const features: string[] = [];
  if (version.title) features.push(version.title);
  if (version.description) features.push(version.description);
  if (version.gitTag) features.push(`Git Tag: ${version.gitTag}`);
  return features;
}

// 异步存储版本摘要到 localStorage
export function storeVersionSummary(summary: VersionSummary): void {
  const stored = localStorage.getItem(SUMMARY_STORAGE_KEY);
  const summaries: VersionSummary[] = stored ? JSON.parse(stored) : [];
  const idx = summaries.findIndex(s => s.versionId === summary.versionId);
  if (idx >= 0) summaries[idx] = summary;
  else summaries.push(summary);
  localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summaries));
}

export function getVersionSummary(versionId: string): VersionSummary | null {
  const stored = localStorage.getItem(SUMMARY_STORAGE_KEY);
  if (!stored) return null;
  const summaries: VersionSummary[] = JSON.parse(stored);
  return summaries.find(s => s.versionId === versionId) ?? null;
}

export function getAllVersionSummaries(): VersionSummary[] {
  const stored = localStorage.getItem(SUMMARY_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// 简单哈希函数
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// 文本相似度计算
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const words1Arr = Array.from(words1);
  const intersection = words1Arr.filter(x => words2.has(x));
  const unionArr = Array.from(new Set([...words1Arr, ...Array.from(words2)]));

  return intersection.length / unionArr.length;
}

// 存储版本向量到 localStorage
export function storeVersionVector(version: Version): VersionSummaryVector {
  const summaryText = generateVersionSummary(version);
  const vectorHash = simpleHash(summaryText);

  const vector: VersionSummaryVector = {
    versionId: version.id,
    version: version.version,
    summaryText,
    vectorHash,
    tags: version.tags,
    createdAt: version.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const stored = localStorage.getItem(VECTOR_STORAGE_KEY);
  const vectors: VersionSummaryVector[] = stored ? JSON.parse(stored) : [];

  const existingIndex = vectors.findIndex(v => v.versionId === version.id);
  if (existingIndex >= 0) {
    vectors[existingIndex] = vector;
  } else {
    vectors.push(vector);
  }

  localStorage.setItem(VECTOR_STORAGE_KEY, JSON.stringify(vectors));

  return vector;
}

// 获取所有版本向量
export function getVersionVectors(): VersionSummaryVector[] {
  const stored = localStorage.getItem(VECTOR_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// 向量语义搜索
export function searchVersionsByVector(query: string, limit: number = 10): VectorSearchResult[] {
  const vectors = getVersionVectors();
  const results: VectorSearchResult[] = [];

  for (const vector of vectors) {
    const similarity = calculateSimilarity(query, vector.summaryText);
    if (similarity > 0.1) {
      results.push({ version: vector, similarity });
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, limit);
}

// 查找相似版本
export function findSimilarVersions(versionId: string, limit: number = 5): SimilarVersion[] {
  const vectors = getVersionVectors();
  const target = vectors.find(v => v.versionId === versionId);

  if (!target) return [];

  const results: SimilarVersion[] = [];

  for (const vector of vectors) {
    if (vector.versionId === versionId) continue;

    const similarity = calculateSimilarity(target.summaryText, vector.summaryText);
    const commonTags = target.tags.filter(tag => vector.tags.includes(tag));

    if (similarity > 0.1) {
      results.push({
        versionId: vector.versionId,
        version: vector.version,
        title: vector.version,
        similarity,
        commonTags,
      });
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, limit);
}

// 删除版本向量
export function deleteVersionVector(versionId: string): void {
  const stored = localStorage.getItem(VECTOR_STORAGE_KEY);
  if (!stored) return;

  const vectors: VersionSummaryVector[] = JSON.parse(stored);
  const filtered = vectors.filter(v => v.versionId !== versionId);
  localStorage.setItem(VECTOR_STORAGE_KEY, JSON.stringify(filtered));
}

// ========== 变更摘要 API 函数 ==========

export async function getVersionChangelog(versionId: string): Promise<ChangelogResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/versions/${versionId}/summary`);
    if (res.status === 404) return null;
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return { data: json.data };
    }
    throw new Error(json.message || '获取变更摘要失败');
  } catch (err) {
    console.warn('[Changelog API] Using fallback:', err);
    const changelog = mockChangelogs.find((c) => c.versionId === versionId);
    if (!changelog) return null;
    return { data: changelog };
  }
}

export async function generateChangelog(
  request: GenerateChangelogRequest
): Promise<ChangelogResponse> {
  try {
    const res = await fetch(`${API_BASE}/versions/${request.versionId}/summary/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return { data: json.data };
    }
    throw new Error(json.message || '生成变更摘要失败');
  } catch (err) {
    console.warn('[Changelog API] Generate failed, using fallback:', err);
    // Need mockVersions here - this function is called from versionSummary.ts
    // but needs version data. We'll use a simplified approach.
    const mockChanges: ChangelogChange[] = [
      { type: "feature", description: "新增功能模块", files: [] },
      { type: "improvement", description: "优化用户体验", files: [] },
      { type: "fix", description: "修复已知问题", files: [] },
    ];

    const newChangelog: VersionChangelog = {
      id: `cl-${Date.now()}`,
      versionId: request.versionId,
      title: request.title || `版本变更日志`,
      content: `版本变更日志`,
      changes: mockChanges,
      generatedAt: new Date().toISOString(),
      generatedBy: "system",
    };

    const existingIndex = mockChangelogs.findIndex((c) => c.versionId === request.versionId);
    if (existingIndex >= 0) {
      mockChangelogs[existingIndex] = newChangelog;
    } else {
      mockChangelogs.unshift(newChangelog);
    }

    return { data: newChangelog };
  }
}

// ========== 版本摘要保存函数 ==========

export async function saveVersionSummary(
  versionId: string,
  data: {
    content?: string;
    features?: string[];
    changes?: string[];
    fixes?: string[];
    breaking?: string[];
    createdBy?: string;
  }
): Promise<VersionSummary | null> {
  try {
    const res = await fetch(`${API_BASE}/versions/${versionId}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || '保存变更摘要失败');
  } catch (err) {
    console.warn('[Summary API] Save failed:', err);
    return null;
  }
}

export async function refreshVersionSummary(
  versionId: string,
  commitLog?: string,
  branchName?: string
): Promise<{ versionSummary: string; generatedAt: string; generatedBy: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/versions/${versionId}/summary/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commitLog, branchName }),
    });
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return {
        versionSummary: json.data?.versionSummary || json.data?.content,
        generatedAt: json.data?.versionSummaryGeneratedAt || json.data?.generatedAt,
        generatedBy: json.data?.versionSummaryGeneratedBy || json.data?.generatedBy,
      };
    }
    throw new Error(json.message || '刷新摘要失败');
  } catch (err) {
    console.warn('[Summary API] Refresh failed:', err);
    return null;
  }
}

// ========== 版本升级配置 API ==========

export async function getUpgradeConfig(versionId: string): Promise<VersionUpgradeConfig | null> {
  await delay(100);
  const config = mockUpgradeConfigs.find(c => c.versionId === versionId);
  if (!config) {
    return {
      id: `cfg-${versionId}`,
      versionId,
      bumpType: 'patch',
      autoTrigger: true,
      triggerOn: ['publish'],
      enablePreview: true,
      historyRetention: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return config;
}

export async function updateUpgradeConfig(
  versionId: string,
  updates: Partial<VersionUpgradeConfig>
): Promise<VersionUpgradeConfig> {
  await delay(50);
  let config = mockUpgradeConfigs.find(c => c.versionId === versionId);

  if (!config) {
    config = {
      id: `cfg-${versionId}`,
      versionId,
      bumpType: 'patch',
      autoTrigger: true,
      triggerOn: ['publish'],
      enablePreview: true,
      historyRetention: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockUpgradeConfigs.push(config);
  }

  Object.assign(config, updates, { updatedAt: new Date().toISOString() });
  return config;
}

export async function previewUpgrade(versionId: string): Promise<UpgradePreview> {
  await delay(150);
  try {
    const config = await getUpgradeConfig(versionId);
    const bumpType = config?.bumpType || 'patch';
    const currentVersion = 'v1.0.0'; // fallback when version data not available
    const effectiveBumpType: VersionBumpType = bumpType === 'custom' ? 'patch' : (bumpType as VersionBumpType);
    const newVersion = autoBumpVersion(currentVersion, effectiveBumpType);
    return {
      currentVersion,
      newVersion,
      bumpType: effectiveBumpType,
      changes: [
        { field: 'version', oldValue: currentVersion, newValue: newVersion },
        { field: 'bumpType', oldValue: '', newValue: effectiveBumpType },
      ],
    };
  } catch {
    // Fallback
    const currentVersion = 'v1.0.0';
    const newVersion = autoBumpVersion(currentVersion, 'patch');
    return {
      currentVersion,
      newVersion,
      bumpType: 'patch',
      changes: [
        { field: 'version', oldValue: currentVersion, newValue: newVersion },
      ],
    };
  }
}

export async function getUpgradeHistory(versionId: string): Promise<UpgradeHistoryRecord[]> {
  await delay(100);
  return mockUpgradeHistory.filter(h => h.versionId === versionId);
}

export async function addUpgradeRecord(record: Omit<UpgradeHistoryRecord, 'id' | 'timestamp'>): Promise<UpgradeHistoryRecord> {
  await delay(50);
  const newRecord: UpgradeHistoryRecord = {
    ...record,
    id: `upg-${Date.now()}`,
    timestamp: new Date().toLocaleString('zh-CN'),
  };
  mockUpgradeHistory.unshift(newRecord);
  return newRecord;
}

// ========== Timeline API ==========

export async function getVersionTimeline(versionId: string): Promise<TimelineEvent[]> {
  const res = await fetch(`${API_BASE}/versions/${versionId}/timeline`);
  const json: TimelineResponse = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data.events;
  }
  throw new Error(json.message || '获取时间线失败');
}

export interface AddTimelineEventRequest {
  note: string;
  actor?: string;
  actorId?: string;
}

export async function addTimelineEvent(
  versionId: string,
  data: AddTimelineEventRequest
): Promise<{ eventId: string }> {
  const res = await fetch(`${API_BASE}/versions/${versionId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '添加时间线事件失败');
}

export async function deleteTimelineEvent(
  versionId: string,
  eventId: string
): Promise<{ eventId: string }> {
  const res = await fetch(`${API_BASE}/versions/${versionId}/events/${eventId}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '删除时间线事件失败');
}

export async function updateTimelineEvent(
  versionId: string,
  eventId: string,
  data: { note: string }
): Promise<{ eventId: string }> {
  const res = await fetch(`${API_BASE}/versions/${versionId}/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '更新时间线事件失败');
}

// ========== ChromaDB Vector Store API ==========

export interface VersionChromaEntry {
  versionId: string;
  versionTag: string;
  summary: string;
  commits: string[];
  relatedTasks: string[];
  createdAt: string;
  tokenUsed: number;
}

export interface SimilarVersionResult {
  versionId: string;
  versionTag: string;
  summary: string;
  createdAt: string;
  similarity: number;
}

export async function indexVersionToChromaDb(versionId: string): Promise<{ stored: boolean }> {
  const res = await fetch(`${API_BASE}/versions/${versionId}/vector`, { method: 'POST' });
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || '向量存储失败');
}

export async function searchVersionsInChroma(
  query: string,
  limit: number = 5
): Promise<SimilarVersionResult[]> {
  const res = await fetch(`${API_BASE}/versions/vector/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data.results;
  throw new Error(json.message || '向量搜索失败');
}

// ========== Git Changelog API ==========

export interface ChangelogFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

export interface GitChangelogResult {
  versionTag: string;
  generatedAt: string;
  markdown: string;
  commitCount: number;
  fileChanges: ChangelogFileChange[];
  summary: {
    features: string[];
    fixes: string[];
    improvements: string[];
    technical: string[];
  };
  screenshots: string[];
}

export async function getGitChangelog(versionId: string): Promise<GitChangelogResult> {
  const res = await fetch(`${API_BASE}/versions/${versionId}/changelog`);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || '获取变更日志失败');
}

export async function getGitFileChanges(
  versionId: string,
  from?: string,
  to?: string
): Promise<{ changes: ChangelogFileChange[]; from: string; to: string }> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const url = `${API_BASE}/versions/${versionId}/file-changes${params.size > 0 ? `?${params}` : ''}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) return json.data;
  throw new Error(json.message || '获取文件变更失败');
}

// ========== React Query Hooks ==========

export function useRefreshVersionSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, commitLog, branchName }: { versionId: string; commitLog?: string; branchName?: string }) =>
      refreshVersionSummary(versionId, commitLog, branchName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["versionChangelog", variables.versionId] });
      queryClient.invalidateQueries({ queryKey: ["versions", variables.versionId] });
    },
  });
}

export function useVersionChangelog(versionId: string) {
  return useQuery({
    queryKey: ["versionChangelog", versionId],
    queryFn: () => getVersionChangelog(versionId),
    enabled: !!versionId,
  });
}

export function useGenerateChangelog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: GenerateChangelogRequest) => generateChangelog(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["versionChangelog", variables.versionId] });
    },
  });
}

export function useUpgradeConfig(versionId: string) {
  return useQuery({
    queryKey: ["upgradeConfig", versionId],
    queryFn: () => getUpgradeConfig(versionId),
    enabled: !!versionId,
  });
}

export function useUpdateUpgradeConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, config }: { versionId: string; config: Partial<VersionUpgradeConfig> }) =>
      updateUpgradeConfig(versionId, config),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["upgradeConfig", variables.versionId] });
    },
  });
}

export function usePreviewUpgrade() {
  return useMutation({
    mutationFn: (versionId: string) => previewUpgrade(versionId),
  });
}

export function useUpgradeHistory(versionId: string) {
  return useQuery({
    queryKey: ["upgradeHistory", versionId],
    queryFn: () => getUpgradeHistory(versionId),
    enabled: !!versionId,
  });
}

export function useVersionVectors() {
  return useQuery({
    queryKey: ["versionVectors"],
    queryFn: () => getVersionVectors(),
  });
}

export function useSearchVersions(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["searchVersions", query],
    queryFn: () => searchVersionsByVector(query),
    enabled: enabled && query.length > 0,
  });
}

export function useSimilarVersions(versionId: string, limit: number = 5) {
  return useQuery({
    queryKey: ["similarVersions", versionId, limit],
    queryFn: () => findSimilarVersions(versionId, limit),
    enabled: !!versionId,
  });
}

export function useStoreVersionVector() {
  return useMutation({
    mutationFn: (version: Version) => {
      storeVersionVector(version);
      return Promise.resolve(version);
    },
  });
}

export function useVersionTimeline(versionId: string | null) {
  return useQuery({
    queryKey: ['versionTimeline', versionId],
    queryFn: () => getVersionTimeline(versionId!),
    enabled: Boolean(versionId),
    staleTime: 30 * 1000,
  });
}

export function useAddTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, data }: { versionId: string; data: AddTimelineEventRequest }) =>
      addTimelineEvent(versionId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['versionTimeline', variables.versionId] });
    },
  });
}

export function useDeleteTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, eventId }: { versionId: string; eventId: string }) =>
      deleteTimelineEvent(versionId, eventId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['versionTimeline', variables.versionId] });
    },
  });
}

export function useUpdateTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, eventId, data }: { versionId: string; eventId: string; data: { note: string } }) =>
      updateTimelineEvent(versionId, eventId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['versionTimeline', variables.versionId] });
    },
  });
}

export function useIndexVersionToChromaDb() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: indexVersionToChromaDb,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['versions'] }),
  });
}

export function useSearchVersionsInChroma(query: string, limit?: number) {
  return useQuery({
    queryKey: ['versionChromaSearch', query, limit],
    queryFn: () => searchVersionsInChroma(query, limit),
    enabled: query.length > 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGitChangelog(versionId: string | null) {
  return useQuery({
    queryKey: ['gitChangelog', versionId],
    queryFn: () => getGitChangelog(versionId!),
    enabled: Boolean(versionId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useGitFileChanges(versionId: string | null, from?: string, to?: string) {
  return useQuery({
    queryKey: ['gitFileChanges', versionId, from, to],
    queryFn: () => getGitFileChanges(versionId!, from, to),
    enabled: Boolean(versionId),
    staleTime: 5 * 60 * 1000,
  });
}

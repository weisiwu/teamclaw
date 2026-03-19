// lib/api/projects.ts — 项目管理 API 封装

const BASE = '/api/v1';

export interface Project {
  id: string;
  name: string;
  source: 'url' | 'local';
  url?: string;
  localPath?: string;
  techStack: string[];
  buildTool?: string;
  hasGit: boolean;
  importedAt: string;
  status: 'active' | 'archived';
}

export interface ImportStep {
  step: number;
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  error?: string;
}

export interface ImportTask {
  taskId: string;
  projectId: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  currentStep: number;
  totalSteps: number;
  steps: ImportStep[];
  startedAt?: string;
  completedAt?: string;
}

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

function check(response: Response): void {
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

async function json<T>(res: Response): Promise<T> {
  check(res);
  const body = await res.json() as ApiResponse<T>;
  if (body.code !== 0) throw new Error(body.message || 'API error');
  return body.data;
}

// GET /projects — 项目列表
export async function fetchProjects(): Promise<{ projects: Project[]; total: number }> {
  return json(await fetch(`${BASE}/projects`));
}

// GET /projects/:id — 项目详情
export async function fetchProject(id: string): Promise<{ project: Project }> {
  return json(await fetch(`${BASE}/projects/${id}`));
}

// GET /projects/:id/tree — 文件树
export async function fetchProjectTree(id: string): Promise<{ tree: FileNode }> {
  return json(await fetch(`${BASE}/projects/${id}/tree`));
}

export interface FileNode {
  name: string;
  type: 'file' | 'dir';
  extension?: string;
  size?: number;
  children?: FileNode[];
}

// POST /projects/import — 发起项目导入
export async function importProject(params: {
  source: 'url' | 'local';
  url?: string;
  localPath?: string;
  name?: string;
}): Promise<{ project: Project; task: ImportTask }> {
  return json(await fetch(`${BASE}/projects/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  }));
}

// GET /projects/import/:taskId — 导入进度
export async function fetchImportStatus(taskId: string): Promise<{ task: ImportTask }> {
  return json(await fetch(`${BASE}/projects/import/${taskId}`));
}

// DELETE /projects/:id — 删除项目
export async function deleteProject(id: string): Promise<{ deleted: string }> {
  return json(await fetch(`${BASE}/projects/${id}`, { method: 'DELETE' }));
}

// GET /projects/:id/feature-map — 功能定位文件
export async function fetchFeatureMap(id: string): Promise<{ featureMap: FeatureMap }> {
  return json(await fetch(`${BASE}/projects/${id}/feature-map`));
}

export interface FeatureMap {
  totalFeatures: number;
  features: FeatureItem[];
}

export interface FeatureItem {
  feature: string;
  description: string;
  module: string;
  files: string[];
}

// GET /projects/:id/docs — 转换后的文档列表
export async function fetchConvertedDocs(id: string): Promise<{ docs: ConvertedDoc[] }> {
  return json(await fetch(`${BASE}/projects/${id}/docs`));
}

export interface ConvertedDoc {
  originalPath: string;
  convertedPath: string;
  format: string;
  title: string;
  size: number;
}

// POST /projects/:id/refresh — 刷新项目
export async function refreshProject(id: string): Promise<{ refresh: RefreshResult }> {
  return json(await fetch(`${BASE}/projects/${id}/refresh`, { method: 'POST' }));
}

export interface RefreshResult {
  projectId: string;
  refreshedAt: string;
  steps: { name: string; status: 'done' | 'skipped' | 'error'; error?: string }[];
  newFeatures: number;
  newDocs: number;
  newCommits: number;
}

// GET /projects/:id/vector-search — 语义搜索
export async function vectorSearch(id: string, query: string, topK = 5): Promise<{ query: string; results: VectorResult[] }> {
  return json(await fetch(`${BASE}/projects/${id}/vector-search?q=${encodeURIComponent(query)}&topK=${topK}`));
}

export interface VectorResult {
  id: string;
  document: string;
  distance: number;
  metadata: Record<string, unknown>;
}

// GET /projects/:id/git-history — Git历史分析
export async function fetchGitHistory(id: string): Promise<{ analysis: GitCommit[] }> {
  return json(await fetch(`${BASE}/projects/${id}/git-history`));
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

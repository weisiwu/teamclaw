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

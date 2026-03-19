const BASE = '/api/v1';

export interface DocItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  path?: string;
}

export interface DocListResponse {
  list: DocItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DocContentResponse {
  content: string;
  format: string;
}

export interface DocVersion {
  versionId: string;
  docId: string;
  versionNumber: number;
  size: number;
  createdAt: string;
  createdBy: string;
  note?: string;
}

export interface DocFavorite {
  favoriteId: string;
  docId: string;
  userId: string;
  createdAt: string;
  docName: string;
  docType: string;
  docSize: number;
}

export interface DocStats {
  totalDocs: number;
  totalSize: number;
  byType: Record<string, number>;
}

export interface RecentAccess {
  docId: string;
  docName: string;
  docType: string;
  accessedAt: string;
}

// ========== 文档列表 ==========

export async function getDocs(params: {
  search?: string;
  type?: string;
  sizeMin?: number;
  sizeMax?: number;
  page?: number;
  pageSize?: number;
} = {}): Promise<DocListResponse> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.type) searchParams.set('type', params.type);
  if (params.sizeMin) searchParams.set('sizeMin', String(params.sizeMin));
  if (params.sizeMax) searchParams.set('sizeMax', String(params.sizeMax));
  searchParams.set('page', String(params.page || 1));
  searchParams.set('pageSize', String(params.pageSize || 20));
  const res = await fetch(`${BASE}/docs?${searchParams}`);
  const data = await res.json();
  return data.data || { list: [], total: 0, page: 1, pageSize: 20 };
}

export async function getDocContent(docId: string): Promise<DocContentResponse> {
  const res = await fetch(`${BASE}/docs/${docId}`);
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message);
  return data.data;
}

export function getDocDownloadUrl(docId: string): string {
  return `${BASE}/docs/${docId}/download`;
}

export async function deleteDoc(docId: string): Promise<void> {
  const res = await fetch(`${BASE}/docs/${docId}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message);
}

// ========== 版本管理 ==========

export async function getDocVersions(docId: string, page = 1, pageSize = 10): Promise<{ list: DocVersion[]; total: number }> {
  const res = await fetch(`${BASE}/docs/${docId}/versions?page=${page}&pageSize=${pageSize}`);
  const data = await res.json();
  return data.data || { list: [], total: 0 };
}

export function getVersionDownloadUrl(docId: string, versionId: string): string {
  return `${BASE}/docs/${docId}/versions/${versionId}`;
}

export async function restoreDocVersion(docId: string, versionId: string): Promise<void> {
  const res = await fetch(`${BASE}/docs/${docId}/versions/${versionId}/restore`, { method: 'POST' });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message);
}

// ========== 收藏管理 ==========

export async function addFavorite(docId: string, userId = 'default'): Promise<void> {
  const res = await fetch(`${BASE}/docs/${docId}/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message);
}

export async function removeFavorite(docId: string, userId = 'default'): Promise<void> {
  const res = await fetch(`${BASE}/docs/${docId}/favorite?userId=${userId}`, { method: 'DELETE' });
  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message);
}

export async function getFavorites(userId = 'default'): Promise<{ list: DocFavorite[]; total: number }> {
  const res = await fetch(`${BASE}/docs/favorites/list?userId=${userId}`);
  const data = await res.json();
  return data.data || { list: [], total: 0 };
}

export async function isFavorite(docId: string, userId = 'default'): Promise<boolean> {
  const res = await fetch(`${BASE}/docs/${docId}/favorite?userId=${userId}`);
  const data = await res.json();
  return data.data?.isFavorite === true;
}

// ========== 最近访问 ==========

export async function getRecentAccess(userId = 'default', limit = 10): Promise<{ list: RecentAccess[]; total: number }> {
  const res = await fetch(`${BASE}/docs/recent/access?userId=${userId}&limit=${limit}`);
  const data = await res.json();
  return data.data || { list: [], total: 0 };
}

// ========== 文档统计 ==========

export async function getDocStats(): Promise<DocStats> {
  const res = await fetch(`${BASE}/docs/stats/overview`);
  const data = await res.json();
  return data.data || { totalDocs: 0, totalSize: 0, byType: {} };
}

const BASE = '/api/v1';

export interface DocItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
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

export async function getDocs(search?: string, page = 1, pageSize = 20): Promise<DocListResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set('search', search);
  const res = await fetch(`${BASE}/docs?${params}`);
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

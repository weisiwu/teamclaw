/**
 * Doc API - Document management and preview
 */

import {
  DocPreviewResult,
} from './types';

const API_BASE = '/api/v1';

export interface DocItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  projectId?: string;
  note?: string;
  path?: string;
}

export interface SupportedPreviewType {
  type: string;
  name: string;
  ext: string[];
}

// Get document preview
export async function getDocPreview(
  docId: string,
  options?: { page?: number; maxLines?: number }
): Promise<DocPreviewResult> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.maxLines) params.set('maxLines', String(options.maxLines));
  
  const res = await fetch(`${API_BASE}/docs/${docId}/preview?${params}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message);
  return json.data;
}

// Download document
export function getDocDownloadUrl(docId: string): string {
  return `${API_BASE}/docs/${docId}/download`;
}

// Get supported preview types
export async function getSupportedPreviewTypes(): Promise<{
  types: SupportedPreviewType[];
  maxFileSize: number;
}> {
  const res = await fetch(`${API_BASE}/docs/preview-supported`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message);
  return json.data;
}

// Get document list (placeholder - integrate with actual docService API)
export async function getDocs(): Promise<DocItem[]> {
  // This should integrate with your actual doc listing API
  const res = await fetch(`${API_BASE}/docs`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message);
  return json.data?.docs || [];
}

/**
 * Search API - Enhanced search with filters and history
 */

import {
  SearchFilter,
  SearchHistoryRecord,
  EnhancedSearchResult,
} from './types';

const API_BASE = '/api/v1';

export interface SearchParams extends SearchFilter {
  q?: string;
  mode?: 'keyword' | 'semantic';
  page?: number;
  pageSize?: number;
  userId?: string;
}

export interface SearchResponse {
  list: EnhancedSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  mode: string;
}

// Search documents
export async function searchDocs(params: SearchParams): Promise<SearchResponse> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.mode) query.set('mode', params.mode);
  if (params.type) query.set('type', params.type);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.projectId) query.set('projectId', params.projectId);
  if (params.sizeMin !== undefined) query.set('sizeMin', String(params.sizeMin));
  if (params.sizeMax !== undefined) query.set('sizeMax', String(params.sizeMax));
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
  if (params.userId) query.set('userId', params.userId);

  const res = await fetch(`${API_BASE}/search/docs?${query}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message);
  return json.data;
}

// Get search suggestions
export async function getSearchSuggestions(query: string, limit?: number): Promise<string[]> {
  const params = new URLSearchParams();
  params.set('q', query);
  if (limit) params.set('limit', String(limit));
  
  const res = await fetch(`${API_BASE}/search/suggestions?${params}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message);
  return json.data.suggestions || [];
}

// Get search history
export async function getSearchHistory(userId?: string, limit?: number): Promise<SearchHistoryRecord[]> {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (limit) params.set('limit', String(limit));
  
  const res = await fetch(`${API_BASE}/search/history?${params}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message);
  return json.data.history || [];
}

// Clear search history
export async function clearSearchHistory(userId?: string): Promise<void> {
  const params = userId ? `?userId=${userId}` : '';
  const res = await fetch(`${API_BASE}/search/history${params}`, { method: 'DELETE' });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message);
}

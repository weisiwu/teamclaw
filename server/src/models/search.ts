/**
 * Search Models - Type definitions for search enhancement
 */

export interface SearchFilter {
  type?: string;         // doc type: md, pdf, txt, code, image
  dateFrom?: string;     // ISO date string
  dateTo?: string;       // ISO date string
  projectId?: string;    // project filter
  sizeMin?: number;      // min size in bytes
  sizeMax?: number;      // max size in bytes
}

export interface SearchHistoryRecord {
  id: string;
  userId: string;
  query: string;
  type: 'keyword' | 'semantic';
  filters?: SearchFilter;
  resultCount: number;
  createdAt: string;
}

export interface EnhancedSearchResult {
  type: 'doc' | 'task' | 'version';
  id: string;
  title: string;
  snippet: string;
  url: string;
  score: number;
  metadata?: Record<string, string | number | boolean>;
}

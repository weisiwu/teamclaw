/**
 * Search Enhancer Service
 * Enhances the basic search with ChromaDB semantic search, filters, and history
 */

import { getOrCreateCollection } from '../utils/chromadb.js';
import { docService } from './docService.js';

const SEARCH_COLLECTION = 'doc_search';

// In-memory search history (max 100 entries per user)
const searchHistoryMap = new Map<string, string[]>();

export interface SearchFilter {
  type?: string;       // doc type: markdown, pdf, text, code, image
  dateFrom?: string;  // ISO date string
  dateTo?: string;    // ISO date string
  projectId?: string;  // project filter
  sizeMin?: number;   // min size in bytes
  sizeMax?: number;   // max size in bytes
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

// Generate embedding for search query
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${process.env.LLM_API_URL || 'http://localhost:9700'}/api/v1/llm/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are an embedding generator. Return a JSON array of 128 numbers representing the semantic embedding of the given text. Only return the array, nothing else.' },
          { role: 'user', content: text }
        ],
        max_tokens: 256
      })
    });
    if (response.ok) {
      const data = await response.json() as { data?: string };
      if (data.data) {
        const parsed = JSON.parse(data.data);
        if (Array.isArray(parsed)) return parsed.slice(0, 128);
      }
    }
  } catch {
    // fallback
  }
  // Fallback: simple hash-based pseudo-embedding
  const normalized = text.toLowerCase().split('').map(c => c.charCodeAt(0) / 255);
  const padded = new Array(128).fill(0);
  normalized.forEach((v, i) => { padded[i % 128] = (padded[i % 128] + v) % 1; });
  return padded;
}

// Build searchable text for a document
function buildDocSearchableText(doc: { id: string; name: string; type: string; note?: string; projectId?: string; uploadedAt?: string; size?: number }): string {
  const parts = [
    doc.name || '',
    doc.type || '',
    doc.note || '',
    doc.projectId || '',
    `uploaded: ${doc.uploadedAt || ''}`,
  ];
  return parts.join(' | ');
}

// Index a document in ChromaDB
export async function indexDocInChroma(doc: {
  id: string; name: string; type: string; note?: string; projectId?: string; uploadedAt?: string;
}): Promise<void> {
  const collection = await getOrCreateCollection(SEARCH_COLLECTION);
  const searchableText = buildDocSearchableText(doc);
  const embedding = await generateEmbedding(searchableText);

  try {
    await collection.delete({ ids: [`doc_${doc.id}`] });
  } catch {
    // ignore
  }

  await collection.add({
    ids: [`doc_${doc.id}`],
    embeddings: [embedding],
    documents: [searchableText],
    metadatas: [{
      id: doc.id,
      name: doc.name,
      type: doc.type,
      note: doc.note || '',
      projectId: doc.projectId || '',
      uploadedAt: doc.uploadedAt || '',
    }]
  });
}

// Semantic search across documents using ChromaDB
export async function semanticDocSearch(
  query: string,
  limit: number = 10
): Promise<Array<{ id: string; name: string; type: string; score: number; metadata: Record<string, string> }>> {
  const collection = await getOrCreateCollection(SEARCH_COLLECTION);
  const queryEmbedding = await generateEmbedding(query);

  try {
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit
    });

    if (!results.ids || results.ids.length === 0 || !results.ids[0]) {
      return [];
    }

    return results.ids[0].map((id, i) => ({
      id: String(id).replace('doc_', ''),
      name: (results.metadatas?.[0]?.[i] as Record<string, string>)?.name ?? '',
      type: (results.metadatas?.[0]?.[i] as Record<string, string>)?.type ?? '',
      score: 1 - ((results.distances?.[0]?.[i] as number) ?? 0),
      metadata: results.metadatas?.[0]?.[i] ?? {},
    }));
  } catch {
    // ChromaDB not available, return empty
    return [];
  }
}

// Apply filters to search results
export function applyFilters(
  docs: Array<{ type?: string; uploadedAt?: string; projectId?: string; size?: number }>,
  filter: SearchFilter
): Array<{ type?: string; uploadedAt?: string; projectId?: string; size?: number }> {
  let result = docs;

  if (filter.type) {
    result = result.filter(d => d.type?.toLowerCase() === filter.type!.toLowerCase());
  }
  if (filter.dateFrom) {
    const from = new Date(filter.dateFrom).getTime();
    result = result.filter(d => new Date(d.uploadedAt).getTime() >= from);
  }
  if (filter.dateTo) {
    const to = new Date(filter.dateTo).getTime();
    result = result.filter(d => new Date(d.uploadedAt).getTime() <= to);
  }
  if (filter.projectId) {
    result = result.filter(d => d.projectId === filter.projectId);
  }
  if (filter.sizeMin !== undefined) {
    result = result.filter(d => d.size >= filter.sizeMin!);
  }
  if (filter.sizeMax !== undefined) {
    result = result.filter(d => d.size <= filter.sizeMax!);
  }

  return result;
}

// Get search suggestions (autocomplete) based on doc names
export function getSearchSuggestions(query: string, limit: number = 5): string[] {
  if (!query || query.length < 2) return [];

  const docs = docService.getDocList();
  const q = query.toLowerCase();
  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const doc of docs) {
    const name = doc.name.toLowerCase();
    if (name.includes(q)) {
      // Extract the matching segment and surrounding context
      const idx = name.indexOf(q);
      const start = Math.max(0, idx - 10);
      const end = Math.min(name.length, idx + q.length + 10);
      const suggestion = (start > 0 ? '...' : '') + doc.name.slice(start, end) + (end < name.length ? '...' : '');
      if (!seen.has(suggestion)) {
        seen.add(suggestion);
        suggestions.push(suggestion);
        if (suggestions.length >= limit) break;
      }
    }
  }

  return suggestions;
}

// Save search query to user history
export function saveSearchHistory(userId: string, query: string): void {
  if (!query || query.trim().length < 2) return;

  const key = `history_${userId}`;
  let history = searchHistoryMap.get(key) || [];

  // Remove duplicate if exists
  history = history.filter(h => h !== query);
  // Add to front
  history.unshift(query);
  // Keep max 20
  if (history.length > 20) history = history.slice(0, 20);

  searchHistoryMap.set(key, history);
}

// Get search history for user
export function getSearchHistory(userId: string, limit: number = 10): string[] {
  const key = `history_${userId}`;
  return (searchHistoryMap.get(key) || []).slice(0, limit);
}

// Clear search history for user
export function clearSearchHistory(userId: string): void {
  searchHistoryMap.delete(`history_${userId}`);
}

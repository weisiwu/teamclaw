/**
 * Search Enhancer Service
 * Enhances the basic search with ChromaDB semantic search, filters, and history
 */
import { getOrCreateCollection } from '../utils/chromadb.js';
import { docService } from './docService.js';
const SEARCH_COLLECTION = 'doc_search';
// In-memory search history (max 100 entries per user)
const searchHistoryMap = new Map();
// Generate embedding for search query
async function generateEmbedding(text) {
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
            const data = await response.json();
            if (data.data) {
                const parsed = JSON.parse(data.data);
                if (Array.isArray(parsed))
                    return parsed.slice(0, 128);
            }
        }
    }
    catch {
        // fallback
    }
    // Fallback: simple hash-based pseudo-embedding
    const normalized = text.toLowerCase().split('').map(c => c.charCodeAt(0) / 255);
    const padded = new Array(128).fill(0);
    normalized.forEach((v, i) => { padded[i % 128] = (padded[i % 128] + v) % 1; });
    return padded;
}
// Build searchable text for a document
function buildDocSearchableText(doc) {
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
export async function indexDocInChroma(doc) {
    const collection = await getOrCreateCollection(SEARCH_COLLECTION);
    const searchableText = buildDocSearchableText(doc);
    const embedding = await generateEmbedding(searchableText);
    try {
        await collection.delete({ ids: [`doc_${doc.id}`] });
    }
    catch {
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
export async function semanticDocSearch(query, limit = 10) {
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
            name: results.metadatas?.[0]?.[i]?.name ?? '',
            type: results.metadatas?.[0]?.[i]?.type ?? '',
            score: 1 - (results.distances?.[0]?.[i] ?? 0),
            metadata: results.metadatas?.[0]?.[i] ?? {},
        }));
    }
    catch {
        // ChromaDB not available, return empty
        return [];
    }
}
// Apply filters to search results
export function applyFilters(docs, filter) {
    let result = docs;
    if (filter.type) {
        result = result.filter(d => d.type?.toLowerCase() === filter.type.toLowerCase());
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
        result = result.filter(d => d.size >= filter.sizeMin);
    }
    if (filter.sizeMax !== undefined) {
        result = result.filter(d => d.size <= filter.sizeMax);
    }
    return result;
}
// Get search suggestions (autocomplete) based on doc names
export function getSearchSuggestions(query, limit = 5) {
    if (!query || query.length < 2)
        return [];
    const docs = docService.getDocList();
    const q = query.toLowerCase();
    const seen = new Set();
    const suggestions = [];
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
                if (suggestions.length >= limit)
                    break;
            }
        }
    }
    return suggestions;
}
// Search history persistence (SQLite + memory cache)
function getDb() {
    try {
        const { getDb } = require('../db/sqlite.js');
        return getDb();
    }
    catch {
        return null;
    }
}
// Ensure search_history table exists
function ensureSearchHistoryTable() {
    try {
        const db = getDb();
        if (!db)
            return;
        db.exec(`
      CREATE TABLE IF NOT EXISTS search_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        query TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'keyword',
        filters TEXT,
        result_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, created_at DESC);
    `);
    }
    catch { /* ignore */ }
}
ensureSearchHistoryTable();
// Save search query to user history (SQLite + memory cache)
export function saveSearchHistory(userId, query, type = 'keyword', filters = {}, resultCount = 0) {
    if (!query || query.trim().length < 2)
        return;
    // Memory cache
    const key = `history_${userId}`;
    let history = searchHistoryMap.get(key) || [];
    history = history.filter(h => h !== query);
    history.unshift(query);
    if (history.length > 20)
        history = history.slice(0, 20);
    searchHistoryMap.set(key, history);
    // SQLite persistence
    try {
        const db = getDb();
        if (!db)
            return;
        const id = `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        db.prepare(`
      INSERT INTO search_history (id, user_id, query, type, filters, result_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, query, type, JSON.stringify(filters), resultCount, new Date().toISOString());
        // Keep max 50 entries per user in DB
        db.prepare(`
      DELETE FROM search_history WHERE user_id = ? AND id NOT IN (
        SELECT id FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
      )
    `).run(userId, userId);
    }
    catch { /* ignore */ }
}
// Get search history for user (SQLite primary, memory fallback)
export function getSearchHistory(userId, limit = 10) {
    // Try memory first
    const key = `history_${userId}`;
    const memHistory = searchHistoryMap.get(key) || [];
    // Try SQLite
    try {
        const db = getDb();
        if (db) {
            const rows = db.prepare(`
        SELECT id, query, type, result_count as resultCount, created_at as createdAt
        FROM search_history
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(userId, limit);
            return rows;
        }
    }
    catch { /* ignore */ }
    // Fallback: convert memory history to structured format
    return memHistory.slice(0, limit).map((q, i) => ({
        id: `mem_${i}`,
        query: q,
        type: 'keyword',
        resultCount: 0,
        createdAt: new Date().toISOString(),
    }));
}
// Clear search history for user
export function clearSearchHistory(userId) {
    searchHistoryMap.delete(`history_${userId}`);
    try {
        const db = getDb();
        db?.prepare('DELETE FROM search_history WHERE user_id = ?').run(userId);
    }
    catch { /* ignore */ }
}
// Get search history records from DB
export function getSearchHistoryRecords(userId, limit = 10) {
    try {
        const db = getDb();
        if (!db)
            return [];
        return db.prepare(`
      SELECT id, query, type, filters, result_count as resultCount, created_at as createdAt
      FROM search_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit);
    }
    catch {
        return [];
    }
}

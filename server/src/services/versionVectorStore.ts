import { getOrCreateCollection } from '../utils/chromadb.js';

const COLLECTION_NAME = 'version_memory';

export interface VersionVectorEntry {
  versionId: string;
  versionTag: string;
  summary: string;
  commits: string[];
  relatedTasks: string[];
  createdAt: string;
  tokenUsed: number;
}

/**
 * Generate embedding for version text using LLM service or fallback
 */
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

/**
 * Build searchable text from version entry
 */
function buildSearchableText(entry: VersionVectorEntry): string {
  const parts = [
    `version ${entry.versionTag}`,
    entry.summary,
    `commits: ${entry.commits.join(', ')}`,
    `tasks: ${entry.relatedTasks.join(', ')}`,
    `created: ${entry.createdAt}`,
    `tokens: ${entry.tokenUsed}`
  ];
  return parts.join(' | ');
}

/**
 * Store version summary in ChromaDB
 */
export async function storeVersionVector(entry: VersionVectorEntry): Promise<void> {
  const collection = await getOrCreateCollection(COLLECTION_NAME);
  const docId = `version_${entry.versionId}`;
  const searchableText = buildSearchableText(entry);
  const embedding = await generateEmbedding(searchableText);

  // Upsert: delete existing first then add new
  try {
    await collection.delete({ ids: [docId] });
  } catch {
    // ignore if not exists
  }

  await collection.add({
    ids: [docId],
    embeddings: [embedding],
    documents: [searchableText],
    metadatas: [{
      versionId: entry.versionId,
      versionTag: entry.versionTag,
      summary: entry.summary,
      createdAt: entry.createdAt
    }]
  });
}

/**
 * Search similar versions by natural language query
 */
export async function searchSimilarVersions(
  query: string,
  limit: number = 5
): Promise<Array<{ versionId: string; versionTag: string; summary: string; createdAt: string; similarity: number }>> {
  const collection = await getOrCreateCollection(COLLECTION_NAME);
  const queryEmbedding = await generateEmbedding(query);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: limit
  });

  if (!results.ids || results.ids.length === 0 || !results.ids[0]) {
    return [];
  }

  return results.ids[0].map((id, i) => ({
    versionId: String(id).replace('version_', ''),
    versionTag: (results.metadatas?.[0]?.[i] as Record<string, string>)?.versionTag ?? '',
    summary: (results.metadatas?.[0]?.[i] as Record<string, string>)?.summary ?? '',
    createdAt: (results.metadatas?.[0]?.[i] as Record<string, string>)?.createdAt ?? '',
    similarity: 1 - ((results.distances?.[0]?.[i] as number) ?? 0)
  }));
}

/**
 * Delete version vector
 */
export async function deleteVersionVector(versionId: string): Promise<void> {
  const collection = await getOrCreateCollection(COLLECTION_NAME);
  await collection.delete({ ids: [`version_${versionId}`] });
}

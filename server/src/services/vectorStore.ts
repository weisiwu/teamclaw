import { createChromaClient } from '../utils/chromadb.js';

interface EmbeddingResult {
  id: string;
  embedding: number[];
  text: string;
}

// Simple embedding via OpenAI-compatible /embeddings endpoint
async function getEmbedding(text: string, apiKey: string, baseUrl?: string): Promise<number[]> {
  const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '') + '/embeddings';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as { data: Array<{ embedding: number[] }> };
  return json.data[0]?.embedding ?? [];
}

export async function initialize(): Promise<void> {
  const client = createChromaClient();
  await client.listCollections();
}

export async function addDocuments(
  collectionName: string,
  texts: string[],
  ids: string[],
  metadatas?: Record<string, unknown>[]
): Promise<void> {
  const client = createChromaClient();
  const collection = await client.getOrCreateCollection({ name: collectionName });

  const apiKey = process.env.OPENAI_API_KEY || '';
  const baseUrl = process.env.OPENAI_BASE_URL;

  const embeddings: number[][] = [];
  for (const text of texts) {
    // eslint-disable-next-line no-await-in-loop
    const emb = await getEmbedding(text, apiKey, baseUrl);
    embeddings.push(emb);
  }

  await collection.add({
    ids,
    embeddings,
    documents: texts,
    metadatas: metadatas || texts.map(() => ({})),
  });
}

export async function query(
  collectionName: string,
  queryText: string,
  topK = 5
): Promise<Array<{ id: string; document: string; distance: number; metadata: Record<string, unknown> }>> {
  const client = createChromaClient();
  const collection = await client.getCollection({ name: collectionName });

  const apiKey = process.env.OPENAI_API_KEY || '';
  const baseUrl = process.env.OPENAI_BASE_URL;

  const queryEmbedding = await getEmbedding(queryText, apiKey, baseUrl);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
  });

  const ids = (results.ids?.[0] ?? []) as string[];
  const docs = (results.documents?.[0] ?? []) as string[];
  const distances = (results.distances?.[0] ?? []) as number[];
  const metas = (results.metadatas?.[0] ?? []) as Record<string, unknown>[];

  return ids.map((id, i) => ({
    id,
    document: docs[i] ?? '',
    distance: distances[i] ?? 0,
    metadata: metas[i] ?? {},
  }));
}

export async function deleteCollection(collectionName: string): Promise<void> {
  const client = createChromaClient();
  await client.deleteCollection({ name: collectionName });
}

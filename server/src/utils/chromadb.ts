import { ChromaClient } from 'chromadb';

let client: ChromaClient | null = null;

export function createChromaClient(): ChromaClient {
  if (!client) {
    const url = process.env.CHROMA_URL || 'http://localhost:8000';
    client = new ChromaClient({ host: url });
  }
  return client;
}

export async function getOrCreateCollection(name: string) {
  const c = createChromaClient();
  return await c.getOrCreateCollection({ name });
}

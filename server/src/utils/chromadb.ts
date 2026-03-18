import { Client } from 'chromadb';

let client: Client | null = null;

export function createChromaClient(): Client {
  if (!client) {
    const url = process.env.CHROMA_URL || 'http://localhost:8000';
    client = new Client({ host: url });
  }
  return client;
}

export async function getOrCreateCollection(name: string) {
  const client = createChromaClient();
  return await client.getOrCreateCollection({ name });
}

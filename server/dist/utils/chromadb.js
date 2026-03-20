import { ChromaClient } from 'chromadb';
let client = null;
export function createChromaClient() {
    if (!client) {
        const url = process.env.CHROMA_URL || 'http://localhost:8000';
        client = new ChromaClient({ host: url });
    }
    return client;
}
export async function getOrCreateCollection(name) {
    const c = createChromaClient();
    return await c.getOrCreateCollection({ name });
}

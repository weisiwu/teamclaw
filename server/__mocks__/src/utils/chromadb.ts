/**
 * Mock ChromaDB client - avoids real ChromaDB connections in tests
 */
export const createChromaClient = () => ({
  listCollections: async () => [],
  getCollection: async () => ({ name: 'mock' }),
  createCollection: async () => ({}),
});

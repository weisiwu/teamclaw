/**
 * Mock PostgreSQL pool - avoids real DB connections in tests
 */
export const pool = {
  query: async (_sql: string, _params?: unknown[]) => {
    return { rows: [], rowCount: 0 };
  },
  connect: async () => ({
    query: async () => ({ rows: [], rowCount: 0 }),
    release: () => {},
  }),
  end: async () => {},
  on: () => {},
};

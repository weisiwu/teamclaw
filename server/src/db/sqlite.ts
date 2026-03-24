/**
 * SQLite stub - provides getDb for modules that expect it
 * This file should be replaced with actual SQLite implementation
 */
export interface DbStub {
  prepare: (sql: string) => {
    all: (...args: unknown[]) => unknown[];
    get: (...args: unknown[]) => unknown;
    run: (...args: unknown[]) => { changes: number; lastInsertRowid: number };
  };
}

export function getDb(): DbStub {
  // Returns a no-op DB stub for testing
  return {
    prepare: () => ({
      all: () => [],
      get: () => null,
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
    }),
  };
}

/**
 * Mock SQLite - avoids real SQLite connections in tests
 */
const noopStub = {
  all: () => [],
  get: () => null,
  run: () => ({ changes: 0, lastInsertRowid: BigInt(0) }),
};

export const getDb = () => ({
  prepare: () => noopStub,
  exec: () => {},
  close: () => {},
});

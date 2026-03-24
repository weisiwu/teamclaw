/**
 * Mock Redis utility - avoids real Redis connections in tests
 */
export const redis = {
  ping: async () => 'PONG',
  get: async () => null,
  set: async () => 'OK',
  del: async () => 1,
  on: () => {},
};

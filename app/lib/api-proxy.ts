/**
 * API Proxy — forwards Next.js API requests to the Express backend.
 *
 * Single source of truth for backend URL resolution.
 * Re-exports proxyToBackend from ./api-shared for convenience.
 */
export { proxyToBackend as proxyNextToBackend } from './api-shared';

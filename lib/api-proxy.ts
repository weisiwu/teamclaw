/**
 * Unified API proxy utility for Next.js API Routes.
 * Forwards requests to the Express backend server.
 *
 * Rule: All `app/api/v1/` route handlers MUST only proxy to the backend.
 * ❌ No business logic here
 * ❌ No direct database access
 * ❌ No in-memory stores
 */

import { NextRequest, NextResponse } from 'next/server';

const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.SERVER_PORT || 9700}`;

/**
 * Proxy a Request to the backend server.
 * Returns a plain Response (for use in Route Handlers).
 * Preserves query string parameters from the original request URL.
 */
export async function proxyToBackend(
  request: Request,
  backendPath: string,
  options?: { method?: string }
): Promise<Response> {
  // Build URL with query params preserved
  const url = new URL(`${SERVER_URL}${backendPath}`);
  const originalUrl = new URL(request.url);
  // Forward all query params
  originalUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  const headers = new Headers(request.headers);
  // Override Host header to match backend
  headers.set('Host', url.host);

  const res = await fetch(url.toString(), {
    method: options?.method || request.method,
    headers,
    body: request.body,
    duplex: 'half',
  } as RequestInit);

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

/**
 * Proxy a NextRequest to the backend, returning a NextResponse.
 * Automatically forwards query parameters and request body.
 * Use this for Next.js route handlers.
 */
export async function proxyNextToBackend(
  request: NextRequest,
  backendPath: string,
  options?: { method?: string }
): Promise<NextResponse> {
  const response = await proxyToBackend(request, backendPath, options);
  const data = await response.text();
  return new NextResponse(data, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

import { NextRequest, NextResponse } from 'next/server';

const SERVER_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9700';

// ========== Request ID ==========
export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ========== JSON Response Helpers ==========
export function jsonSuccess<T>(data: T, requestId?: string): NextResponse {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (requestId) headers['X-Request-ID'] = requestId;

  return new NextResponse(
    JSON.stringify({ code: 200, data, message: 'ok' }),
    { status: 200, headers }
  );
}

export function jsonError(
  message: string,
  status = 500,
  requestId?: string,
  code = status
): NextResponse {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (requestId) headers['X-Request-ID'] = requestId;

  return new NextResponse(
    JSON.stringify({ code, data: null, message }),
    { status, headers }
  );
}

// ========== CORS Preflight ==========
export function optionsResponse(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Request-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// ========== Auth Guard ==========
/**
 * Require a valid Bearer token.
 * Returns the decoded user id if valid, or a NextResponse with 401 error.
 */
export function requireAuth(
  request: NextRequest,
  requestId?: string
): string | NextResponse {
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.trim();

  if (!bearer || !bearer.startsWith('Bearer ')) {
    return jsonError('Unauthorized: missing or invalid Bearer token', 401, requestId);
  }

  const token = bearer.slice(7); // strip 'Bearer '
  if (!token) {
    return jsonError('Unauthorized: empty token', 401, requestId);
  }

  // The Express backend validates the JWT. Here we just pass it through.
  // Decode base64 payload (middle part of JWT) to extract user id if needed.
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return payload.userId || payload.sub || payload.id || token;
    }
    return token;
  } catch {
    return token;
  }
}

// ========== Proxy to Express Backend ==========
export async function proxyToBackend(
  request: NextRequest,
  path: string,
  options: RequestInit = {}
): Promise<NextResponse> {
  const url = `${SERVER_URL}${path}`;
  const requestId = request.headers.get('X-Request-ID') || generateRequestId();

  // Forward relevant headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId,
    ...(options.headers || {}),
  };

  // Forward Authorization if present
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    (headers as Record<string, string>)['Authorization'] = authHeader;
  }

  let body: BodyInit | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      method: request.method,
      headers,
      body,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backend unreachable';
    return jsonError(`后端服务不可用: ${message}`, 503, requestId);
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  const responseHeaders: HeadersInit = {
    'X-Request-ID': requestId,
  };

  if (isJson) {
    responseHeaders['Content-Type'] = 'application/json';
  }

  // Forward rate-limit headers if present
  const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
  if (rateLimitRemaining) responseHeaders['x-ratelimit-remaining'] = rateLimitRemaining;

  const text = await response.text();

  // Non-JSON error responses (HTML 404/500 from Express) → surface as JSON error
  if (!isJson && !response.ok) {
    return new NextResponse(
      JSON.stringify({
        code: response.status,
        data: null,
        message: `后端返回非JSON响应 (HTTP ${response.status})，请检查后端服务状态`,
      }),
      { status: response.status, headers: responseHeaders }
    );
  }

  return new NextResponse(text, {
    status: response.status,
    headers: responseHeaders,
  });
}

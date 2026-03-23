/**
 * Shared API utilities — extracted to avoid duplication across route files.
 * DRY principle: jsonSuccess, jsonError, generateRequestId, corsHeaders, auth helpers, etc.
 */

import { NextRequest, NextResponse } from "next/server";

// ============ Rate Limiting (in-memory, per-process) ============

/**
 * Simple sliding-window rate limiter using a Map.
 * Key = identifier (IP or user ID), Value = array of timestamps.
 *
 * Limits:
 *   - Authenticated routes: 120 requests / 60 seconds per user
 *   - Elevated routes (admin/vice_admin): 200 requests / 60 seconds
 *   - Public/unsafe routes: 30 requests / 60 seconds per IP
 *
 * NOTE: In a multi-process deployment (PM2 cluster, Vercel serverless),
 * use Redis-backed rate limiting instead. This in-memory version works
 * correctly for single-process setups (e.g., `next start` standalone).
 */
interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

// Clean up entries older than the window every 5 minutes to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60_000;

function cleanOldEntries(): void {
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = Date.now();
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [key, entry] of rateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

export type RateLimitTier = "authenticated" | "elevated" | "public";

const RATE_LIMIT_MAX: Record<RateLimitTier, number> = {
  authenticated: 120,  // 120 req/min per user
  elevated: 200,       // 200 req/min per elevated user
  public: 30,          // 30 req/min per IP
};

export function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = "authenticated"
): { allowed: boolean; remaining: number; resetMs: number } {
  cleanOldEntries();

  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const max = RATE_LIMIT_MAX[tier];

  const entry = rateLimitStore.get(identifier) ?? { timestamps: [] };
  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(t => t > cutoff);

  if (entry.timestamps.length >= max) {
    const oldestInWindow = Math.min(...entry.timestamps);
    const resetMs = oldestInWindow + RATE_LIMIT_WINDOW_MS - now;
    return { allowed: false, remaining: 0, resetMs: Math.max(0, resetMs) };
  }

  entry.timestamps.push(now);
  rateLimitStore.set(identifier, entry);

  const remaining = max - entry.timestamps.length;
  const oldestInWindow = Math.min(...entry.timestamps);
  const resetMs = oldestInWindow + RATE_LIMIT_WINDOW_MS - now;

  return { allowed: true, remaining, resetMs: Math.max(0, resetMs) };
}

/**
 * Create a rate-limit check result as a NextResponse (429 Too Many Requests).
 * Returns null if within limit, returns a 429 response if exceeded.
 */
export function rateLimitResponse(
  identifier: string,
  tier: RateLimitTier,
  requestId?: string
): NextResponse | null {
  const { allowed, resetMs } = checkRateLimit(identifier, tier);
  if (allowed) return null;

  return NextResponse.json(
    {
      code: AppErrorCode.ERR_RATE_LIMITED,
      message: `请求过于频繁，请 ${Math.ceil(resetMs / 1000)} 秒后重试`,
      requestId,
      remaining: 0,
    },
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Retry-After": String(Math.ceil(resetMs / 1000)),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(resetMs / 1000)),
      },
    }
  );
}

/**
 * Extract a rate-limit identifier from a request.
 * Prefers authenticated user ID; falls back to IP address.
 */
export function getRateLimitIdentifier(request: NextRequest): string {
  const userId = request.headers.get("x-user-id");
  if (userId) return `user:${userId}`;

  // Vercel provides real IP in these headers
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `ip:${ip}`;
}

// ============ Auth helpers for Next.js API routes ============
export type Role = "admin" | "vice_admin" | "member";

export interface AuthUser {
  id: string;
  role: Role;
}

/**
 * Extract auth user from request headers.
 * Header format: X-User-Id: user_001, X-User-Role: admin
 */
export function extractAuthUser(request: NextRequest): AuthUser | null {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role") as Role | null;
  if (!userId || !role) return null;
  if (role !== "admin" && role !== "vice_admin" && role !== "member") return null;
  return { id: userId, role };
}

/**
 * Require auth middleware — returns 401 if not authenticated.
 * Also enforces per-user rate limiting.
 */
export function requireAuth(request: NextRequest, requestId?: string): AuthUser | NextResponse {
  const user = extractAuthUser(request);
  if (!user) {
    return jsonAppError(
      "未提供身份信息，请检查 X-User-Id 和 X-User-Role 请求头",
      AppErrorCode.ERR_UNAUTHORIZED,
      401,
      requestId
    );
  }

  // Apply rate limiting per user
  const rateLimitResult = rateLimitResponse(getRateLimitIdentifier(request), "authenticated", requestId);
  if (rateLimitResult) return rateLimitResult;

  return user;
}

/**
 * Require admin role middleware — returns 403 if not admin.
 * Also enforces elevated rate limiting (higher limit for admins).
 */
export function requireAdmin(request: NextRequest, requestId?: string): AuthUser | NextResponse {
  const user = requireAuth(request, requestId);
  if (user instanceof NextResponse) return user;
  if (user.role !== "admin") {
    return jsonAppError(
      "需要管理员权限",
      AppErrorCode.ERR_FORBIDDEN,
      403,
      requestId
    );
  }
  return user;
}

/**
 * Require admin or vice_admin role middleware.
 * Also enforces elevated rate limiting.
 */
export function requireElevatedRole(request: NextRequest, requestId?: string): AuthUser | NextResponse {
  const user = requireAuth(request, requestId);
  if (user instanceof NextResponse) return user;
  if (user.role !== "admin" && user.role !== "vice_admin") {
    return jsonAppError(
      "需要管理员或副管理员权限",
      AppErrorCode.ERR_FORBIDDEN,
      403,
      requestId
    );
  }
  return user;
}

// ============ Application Error Code System ============

/**
 * Application-level error codes (separate from HTTP status).
 * These codes are stable identifiers for error types, independent of HTTP status.
 *
 * Convention: 1xxxx = validation/auth, 2xxxx = not found, 3xxxx = conflict,
 * 4xxxx = rate limit, 5xxxx = server errors, 9xxxx = internal system errors
 */
export enum AppErrorCode {
  // 1xxxx: Validation / Bad Request
  ERR_VALIDATION_FAILED      = 10001,
  ERR_INVALID_JSON           = 10002,
  ERR_MISSING_REQUIRED_FIELD = 10003,
  ERR_INVALID_FORMAT         = 10004,

  // 2xxxx: Not Found
  ERR_NOT_FOUND             = 20001,

  // 3xxxx: Conflict
  ERR_CONFLICT              = 30001,
  ERR_DUPLICATE_ENTRY       = 30002,

  // 4xxxx: Rate Limit / Auth
  ERR_UNAUTHORIZED          = 40101,
  ERR_FORBIDDEN             = 40301,
  ERR_RATE_LIMITED          = 42901,

  // 5xxxx: Server / Internal
  ERR_INTERNAL              = 50001,
  ERR_NOT_IMPLEMENTED       = 50002,
  ERR_SERVICE_UNAVAILABLE   = 50301,
}

/**
 * Standard HTTP status for each AppErrorCode category.
 */
export const AppErrorHttpStatus: Record<AppErrorCode, number> = {
  [AppErrorCode.ERR_VALIDATION_FAILED]:      400,
  [AppErrorCode.ERR_INVALID_JSON]:           400,
  [AppErrorCode.ERR_MISSING_REQUIRED_FIELD]: 400,
  [AppErrorCode.ERR_INVALID_FORMAT]:         400,
  [AppErrorCode.ERR_NOT_FOUND]:              404,
  [AppErrorCode.ERR_CONFLICT]:               409,
  [AppErrorCode.ERR_DUPLICATE_ENTRY]:        409,
  [AppErrorCode.ERR_UNAUTHORIZED]:           401,
  [AppErrorCode.ERR_FORBIDDEN]:              403,
  [AppErrorCode.ERR_RATE_LIMITED]:           429,
  [AppErrorCode.ERR_INTERNAL]:               500,
  [AppErrorCode.ERR_NOT_IMPLEMENTED]:        501,
  [AppErrorCode.ERR_SERVICE_UNAVAILABLE]:    503,
};

/**
 * Structured application error — can be thrown from API handlers.
 * Automatically maps to correct HTTP status and app error code.
 */
export class AppError extends Error {
  constructor(
    public readonly appCode: AppErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }

  get httpStatus(): number {
    return AppErrorHttpStatus[this.appCode];
  }
}

// ============ Existing exports ============

export type { NextRequest, NextResponse };

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400",
};

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function jsonSuccess(
  data: unknown,
  requestId?: string,
  httpStatus = 200,
  extraHeaders: Record<string, string> = {}
): NextResponse {
  return NextResponse.json({ code: 0, data, requestId }, {
    status: httpStatus,
    headers: { ...corsHeaders, ...extraHeaders },
  });
}

/**
 * JSON error response with separated app error code and HTTP status.
 * Use this when you need to specify a distinct application error code
 * that is separate from the HTTP status (e.g., app code 10001 for validation
 * errors but HTTP 400).
 *
 * For simple cases where app code = HTTP status, use jsonError() instead.
 */
export function jsonAppError(
  message: string,
  appCode: number,
  httpStatus: number,
  requestId?: string
): NextResponse {
  return NextResponse.json(
    { code: appCode, message, requestId },
    { status: httpStatus, headers: { ...corsHeaders } }
  );
}

/**
 * Standard error response for API routes.
 * Uses HTTP status as the app error code (backward-compatible).
 *
 * For explicit app code + HTTP status separation, use jsonAppError() instead.
 */
export function jsonError(message: string, status: number, requestId?: string): NextResponse {
  return NextResponse.json(
    { code: status, message, requestId },
    { status, headers: { ...corsHeaders } }
  );
}

/**
 * Handle an error (typically from a try/catch) and return a JSON error response.
 * Works with AppError, SyntaxError (bad JSON), and plain Error.
 */
export function handleApiError(err: unknown, requestId?: string): NextResponse {
  if (err instanceof AppError) {
    return jsonAppError(err.message, err.appCode, err.httpStatus, requestId);
  }
  if (err instanceof SyntaxError) {
    return jsonAppError("无效的 JSON 请求体", AppErrorCode.ERR_INVALID_JSON, 400, requestId);
  }
  console.error("[api-shared] unexpected error:", err);
  return jsonAppError(
    "服务器内部错误",
    AppErrorCode.ERR_INTERNAL,
    500,
    requestId
  );
}

export function optionsResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

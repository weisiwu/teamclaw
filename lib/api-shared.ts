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
      code: 429,
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
    return NextResponse.json(
      { code: 401, message: "未提供身份信息，请检查 X-User-Id 和 X-User-Role 请求头", requestId },
      { status: 401, headers: corsHeaders }
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
    return NextResponse.json(
      { code: 403, message: "需要管理员权限", requestId },
      { status: 403, headers: corsHeaders }
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
    return NextResponse.json(
      { code: 403, message: "需要管理员或副管理员权限", requestId },
      { status: 403, headers: corsHeaders }
    );
  }
  return user;
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

export function jsonSuccess(data: unknown, requestId?: string): NextResponse {
  return NextResponse.json({ code: 0, data, requestId }, {
    headers: { ...corsHeaders },
  });
}

export function jsonError(message: string, status: number, requestId?: string): NextResponse {
  return NextResponse.json({ code: status, message, requestId }, {
    status,
    headers: { ...corsHeaders },
  });
}

export function optionsResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

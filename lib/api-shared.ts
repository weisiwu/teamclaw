/**
 * Shared API utilities — extracted to avoid duplication across route files.
 * DRY principle: jsonSuccess, jsonError, generateRequestId, corsHeaders, auth helpers, etc.
 */

import { NextRequest, NextResponse } from "next/server";

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
 */
export function requireAuth(request: NextRequest, requestId?: string): AuthUser | NextResponse {
  const user = extractAuthUser(request);
  if (!user) {
    return NextResponse.json(
      { code: 401, message: "未提供身份信息，请检查 X-User-Id 和 X-User-Role 请求头", requestId },
      { status: 401, headers: corsHeaders }
    );
  }
  return user;
}

/**
 * Require admin role middleware — returns 403 if not admin.
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

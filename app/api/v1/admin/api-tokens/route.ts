import { NextRequest, NextResponse } from "next/server";
import { generateRequestId, jsonSuccess, jsonError, requireAuth } from "@/lib/api-shared";

const BACKEND_BASE = process.env.BACKEND_URL || "http://localhost:3001";

/**
 * GET /api/v1/admin/api-tokens
 * List API tokens (proxies to backend)
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const url = `${BACKEND_BASE}/api/v1/admin/api-tokens${qs ? `?${qs}` : ""}`;

    const resp = await fetch(url, {
      headers: {
        "X-Request-ID": requestId,
        Cookie: request.headers.get("Cookie") || "",
      },
      credentials: "include",
    });

    const data = await resp.json();
    return jsonSuccess(data, requestId);
  } catch (err) {
    console.error("[api-tokens] GET error:", err);
    return jsonError("Failed to fetch API tokens", 500, requestId);
  }
}

/**
 * POST /api/v1/admin/api-tokens
 * Create a new API token (proxies to backend)
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const url = `${BACKEND_BASE}/api/v1/admin/api-tokens`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        Cookie: request.headers.get("Cookie") || "",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return jsonError(data.message || "Failed to create API token", resp.status, requestId);
    }
    return jsonSuccess(data, requestId);
  } catch (err) {
    console.error("[api-tokens] POST error:", err);
    return jsonError("Failed to create API token", 500, requestId);
  }
}

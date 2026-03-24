import { NextRequest, NextResponse } from "next/server";
import { generateRequestId, jsonSuccess, jsonError, requireAuth } from "@/lib/api-shared";

const BACKEND_BASE = process.env.BACKEND_URL || "http://localhost:3001";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/admin/api-tokens/:id/verify
 * Verify an API token by testing its connectivity
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const url = `${BACKEND_BASE}/api/v1/admin/api-tokens/${id}/verify`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        Cookie: request.headers.get("Cookie") || "",
      },
      credentials: "include",
    });

    const data = await resp.json();
    if (!resp.ok) {
      return jsonError(data.message || "Verification failed", resp.status, requestId);
    }
    return jsonSuccess(data, requestId);
  } catch (err) {
    console.error("[api-tokens:verify] error:", err);
    return jsonError("Failed to verify API token", 500, requestId);
  }
}

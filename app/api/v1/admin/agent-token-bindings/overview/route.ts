import { NextRequest, NextResponse } from "next/server";
import { generateRequestId, jsonSuccess, jsonError, requireAuth } from "@/lib/api-shared";

const BACKEND_BASE = process.env.BACKEND_URL || "http://localhost:3001";

/**
 * GET /api/v1/admin/agent-token-bindings/overview
 * Get the full binding overview matrix (all agents × all tokens).
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const url = `${BACKEND_BASE}/api/v1/admin/agent-token-bindings/overview`;
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
    console.error("[agent-token-bindings/overview] GET error:", err);
    return jsonError("Failed to fetch bindings overview", 500, requestId);
  }
}

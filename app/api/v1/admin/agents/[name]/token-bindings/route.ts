import { NextRequest, NextResponse } from "next/server";
import { generateRequestId, jsonSuccess, jsonError, requireAuth } from "@/lib/api-shared";

const BACKEND_BASE = process.env.BACKEND_URL || "http://localhost:3001";

interface RouteParams {
  params: Promise<{ name: string }>;
}

/**
 * GET /api/v1/admin/agents/[name]/token-bindings
 * List token bindings for a specific agent.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { name } = await params;
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const url = `${BACKEND_BASE}/api/v1/admin/agents/${encodeURIComponent(name)}/token-bindings`;
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
    console.error("[agent-token-bindings] GET error:", err);
    return jsonError("Failed to fetch agent token bindings", 500, requestId);
  }
}

/**
 * POST /api/v1/admin/agents/[name]/token-bindings
 * Create a new token binding for the specified agent.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { name } = await params;
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const url = `${BACKEND_BASE}/api/v1/admin/agents/${encodeURIComponent(name)}/token-bindings`;

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
      return jsonError(data.message || "Failed to create token binding", resp.status, requestId);
    }
    return jsonSuccess(data, requestId);
  } catch (err) {
    console.error("[agent-token-bindings] POST error:", err);
    return jsonError("Failed to create token binding", 500, requestId);
  }
}

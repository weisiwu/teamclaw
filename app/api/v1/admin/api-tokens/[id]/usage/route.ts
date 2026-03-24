import { NextRequest, NextResponse } from "next/server";
import { generateRequestId, jsonSuccess, jsonError, requireAuth } from "@/lib/api-shared";

const BACKEND_BASE = process.env.BACKEND_URL || "http://localhost:3001";

/**
 * GET /api/v1/admin/api-tokens/:id/usage
 * 获取单个 API Token 的用量详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const url = `${BACKEND_BASE}/api/v1/admin/api-tokens/${id}/usage${qs ? `?${qs}` : ""}`;

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
    console.error("[api-tokens/:id/usage] GET error:", err);
    return jsonError("Failed to fetch token usage detail", 500, requestId);
  }
}

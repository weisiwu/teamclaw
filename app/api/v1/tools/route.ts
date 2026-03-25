import { NextRequest, NextResponse } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse, generateRequestId } from "@/lib/api-shared";

/**
 * GET /api/v1/tools — list tools
 * POST /api/v1/tools — create tool
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();
  try {
    return await proxyNextToBackend(request, "/api/v1/tools");
  } catch (err) {
    console.error(`[tools] GET proxy error:`, err);
    return NextResponse.json(
      { code: 503, message: "后端服务不可用，请确保服务器已启动", requestId },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();
  try {
    return await proxyNextToBackend(request, "/api/v1/tools", { method: "POST" });
  } catch (err) {
    console.error(`[tools] POST proxy error:`, err);
    return NextResponse.json(
      { code: 503, message: "后端服务不可用，请确保服务器已启动", requestId },
      { status: 503 }
    );
  }
}

export { optionsResponse as OPTIONS };

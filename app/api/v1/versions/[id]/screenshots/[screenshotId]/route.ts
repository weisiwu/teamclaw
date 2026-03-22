import { NextRequest, NextResponse } from "next/server";

/** Backend server URL — proxy to the Node.js backend on port 9700 */
const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:9700";

/** CORS headers for cross-origin API access */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400",
};

/** Generate a short unique request ID */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Proxy helper — forwards requests to the backend server and returns the response.
 */
async function proxyToBackend(
  req: NextRequest,
  backendPath: string,
  options: { method?: string } = {}
): Promise<NextResponse> {
  const url = `${BACKEND_URL}${backendPath}`;
  const requestId = generateRequestId();
  try {
    const headers: HeadersInit = {
      "Content-Type": req.headers.get("content-type") || "application/json",
      "X-Request-ID": requestId,
    };
    const auth = req.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;

    const resp = await fetch(url, {
      method: options.method || req.method,
      headers,
    });

    const data = await resp.text();
    return new NextResponse(data, {
      status: resp.status,
      headers: {
        ...corsHeaders,
        "Content-Type": resp.headers.get("content-type") || "application/json",
        "X-Request-ID": requestId,
      },
    });
  } catch (err) {
    console.error(`[screenshot/:id proxy] Failed to reach backend at ${url}:`, err);
    return NextResponse.json(
      { code: 503, message: "Backend server unavailable", requestId },
      { status: 503, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/v1/versions/[id]/screenshots/[screenshotId]
 * Proxy to backend: GET /api/v1/versions/:id/screenshots/:screenshotId
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; screenshotId: string }> }
) {
  const { id, screenshotId } = await params;
  if (!id || !screenshotId) {
    return NextResponse.json(
      { code: 400, message: "版本 ID 和截图 ID 都不能为空" },
      { status: 400, headers: corsHeaders }
    );
  }
  return proxyToBackend(req, `/api/v1/versions/${id}/screenshots/${screenshotId}`);
}

/**
 * DELETE /api/v1/versions/[id]/screenshots/[screenshotId]
 * Proxy to backend: DELETE /api/v1/versions/:id/screenshots/:screenshotId
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; screenshotId: string }> }
) {
  const { id, screenshotId } = await params;
  if (!id || !screenshotId) {
    return NextResponse.json(
      { code: 400, message: "版本 ID 和截图 ID 都不能为空" },
      { status: 400, headers: corsHeaders }
    );
  }
  return proxyToBackend(req, `/api/v1/versions/${id}/screenshots/${screenshotId}`, { method: "DELETE" });
}

/**
 * OPTIONS /api/v1/versions/[id]/screenshots/[screenshotId]
 * CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

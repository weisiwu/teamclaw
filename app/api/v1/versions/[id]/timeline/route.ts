import { NextRequest, NextResponse } from "next/server";

/** Backend server URL — proxy to the Node.js backend on port 9700 */
const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:9700";

/** CORS headers for cross-origin API access */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400",
};

/** Generate a short unique request ID */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Proxy helper — forwards requests to the backend server and returns the response.
 * Rewrites /api/v1/* → /api/v1/* on the backend.
 */
async function proxyToBackend(
  req: NextRequest,
  path: string,
  options: { method?: string; body?: BodyInit } = {}
): Promise<NextResponse> {
  const url = `${BACKEND_URL}${path}`;
  const requestId = generateRequestId();
  try {
    const headers: HeadersInit = {
      "Content-Type": req.headers.get("content-type") || "application/json",
      "X-Request-ID": requestId,
    };
    const auth = req.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;

    const fetchOptions: RequestInit = {
      method: options.method || req.method,
      headers,
    };
    if (options.body !== undefined) {
      fetchOptions.body = options.body;
    } else if (req.method !== "GET" && req.method !== "HEAD") {
      // Clone body for POST/PUT/DELETE
      const clone = req.clone();
      fetchOptions.body = await clone.text();
    }

    const resp = await fetch(url, fetchOptions);
    const data = await resp.text();
    return new NextResponse(data, {
      status: resp.status,
      headers: {
        ...corsHeaders,
        "Content-Type": resp.headers.get("content-type") || "application/json",
      },
    });
  } catch (err) {
    console.error(`[timeline proxy] Failed to reach backend at ${url}:`, err);
    return NextResponse.json(
      { code: 503, message: "Backend server unavailable", requestId },
      { status: 503, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/v1/versions/[id]/timeline
 * Proxy to backend: GET /api/v1/versions/:id/timeline
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id.trim() === "") {
    return NextResponse.json(
      { code: 400, message: "版本 ID 不能为空" },
      { status: 400, headers: corsHeaders }
    );
  }
  return proxyToBackend(req, `/api/v1/versions/${id}/timeline`);
}

/**
 * POST /api/v1/versions/[id]/timeline
 * Proxy to backend: POST /api/v1/versions/:id/events (add manual note)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id.trim() === "") {
    return NextResponse.json(
      { code: 400, message: "版本 ID 不能为空" },
      { status: 400, headers: corsHeaders }
    );
  }
  const body = await req.json();
  return proxyToBackend(req, `/api/v1/versions/${id}/events`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * OPTIONS /api/v1/versions/[id]/timeline
 * CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

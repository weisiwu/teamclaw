import { NextRequest, NextResponse } from "next/server";

/** Backend server URL — proxy to the Node.js backend on port 9700 */
const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:9700";

/** CORS headers for cross-origin API access */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400",
};

/** Generate a short unique request ID */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Transform backend VersionSummary format to frontend VersionChangelog format.
 */
function transformToFrontend(data: Record<string, unknown>): Record<string, unknown> {
  const changes_detail = data.changes_detail as Array<{ type: string; description: string; files?: string[] }> | undefined;
  const changes = changes_detail && changes_detail.length > 0
    ? changes_detail
    : [
        ...((data.features as string[] || []).map((d: string) => ({ type: "feature", description: d }))),
        ...((data.fixes as string[] || []).map((d: string) => ({ type: "fix", description: d }))),
        ...((data.changes as string[] || []).map((d: string) => ({ type: "improvement", description: d }))),
        ...((data.breaking as string[] || []).map((d: string) => ({ type: "breaking", description: d }))),
      ];

  return {
    id: data.id,
    versionId: data.versionId,
    title: data.title || "",
    content: data.content || "",
    changes,
    generatedAt: data.generatedAt || data.generated_at || new Date().toISOString(),
    generatedBy: data.generatedBy || data.generated_by || "AI",
  };
}

/**
 * POST /api/v1/versions/:id/changelog/generate
 * Proxy to backend: POST /api/v1/versions/:id/summary/generate
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const { id } = await params;

  if (!id || id.trim() === "") {
    return NextResponse.json(
      { code: 400, message: "版本 ID 不能为空" },
      { status: 400, headers: corsHeaders }
    );
  }

  const url = `${BACKEND_URL}/api/v1/versions/${id}/summary/generate`;
  try {
    const body = await req.json();
    const headers: HeadersInit = {
      "Content-Type": req.headers.get("content-type") || "application/json",
      "X-Request-ID": requestId,
    };
    const auth = req.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await resp.json() as Record<string, unknown>;
    if (data.data) {
      (data as Record<string, unknown>).data = transformToFrontend(data.data as Record<string, unknown>);
    }

    return NextResponse.json(data, {
      status: resp.status,
      headers: { ...corsHeaders, "X-Request-ID": requestId },
    });
  } catch (err) {
    console.error(`[changelog/generate proxy] Failed to reach backend at ${url}:`, err);
    return NextResponse.json(
      { code: 503, message: "Backend server unavailable", requestId },
      { status: 503, headers: corsHeaders }
    );
  }
}

/**
 * OPTIONS /api/v1/versions/:id/changelog/generate
 * CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

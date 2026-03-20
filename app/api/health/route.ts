import { NextRequest, NextResponse } from "next/server";

/** CORS headers for cross-origin API access */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400",
};

/**
 * Generate a short unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Unified JSON error response helper (consistent with other API routes)
 */
function jsonError(message: string, status: number, requestId?: string): NextResponse {
  return NextResponse.json(
    { code: status, message, requestId },
    { status, headers: corsHeaders }
  );
}

/**
 * Unified success response helper (consistent with other API routes)
 */
function jsonSuccess(data: unknown, requestId?: string): NextResponse {
  return NextResponse.json({ code: 0, data, requestId }, {
    headers: { ...corsHeaders },
  });
}

/**
 * OPTIONS /api/health
 * CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/health
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  try {
    const healthData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "teamclaw-frontend",
      uptime: Math.round(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: "MB",
      },
    };

    return jsonSuccess(healthData, requestId);
  } catch (error) {
    console.error("[Health] Error:", error);
    return jsonError("Health check failed", 500, requestId);
  }
}

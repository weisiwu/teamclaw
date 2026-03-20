import { NextRequest, NextResponse } from "next/server";

/** Allowed env values for build triggers */
const VALID_ENVS = new Set(["production", "staging", "development", "test"]);

/** CORS headers for cross-origin API access */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400",
};

/** Generate a short unique request ID */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Unified JSON error response helper
 */
function jsonError(message: string, status: number, requestId?: string): NextResponse {
  return NextResponse.json(
    { code: status, message, requestId },
    { status }
  );
}

/**
 * Unified success response helper
 */
function jsonSuccess(data: unknown, requestId?: string): NextResponse {
  return NextResponse.json({ code: 0, data, requestId }, {
    headers: { ...corsHeaders },
  });
}

/**
 * OPTIONS /api/v1/build/trigger
 * CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/v1/build/trigger
 * 触发构建任务
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  // Validate Content-Type
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return jsonError("Content-Type must be application/json", 415, requestId);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400, requestId);
  }

  const { versionId, versionName, env, buildId } = body;

  if (!versionId || typeof versionId !== "string" || !/^[a-zA-Z0-9_.-]+$/.test(versionId)) {
    return jsonError("Missing or invalid versionId (must be alphanumeric, dash, underscore or dot)", 400, requestId);
  }
  if (!versionName || typeof versionName !== "string" || versionName.length > 128) {
    return jsonError("Missing or invalid versionName (max 128 chars)", 400, requestId);
  }
  if (!env || typeof env !== "string" || !VALID_ENVS.has(env)) {
    return jsonError(`Missing or invalid env. Must be one of: ${Array.from(VALID_ENVS).join(", ")}`, 400, requestId);
  }

  const generatedBuildId = buildId && typeof buildId === "string" && /^[a-zA-Z0-9_.-]+$/.test(buildId)
    ? buildId
    : `build-${Date.now().toString(36)}`;

  // Currently a mock implementation
  console.log(`[Build Trigger][${requestId}] buildId=${generatedBuildId}, version=${versionName}, env=${env}`);

  return jsonSuccess({
    buildId: generatedBuildId,
    versionId,
    versionName,
    env,
    status: "building",
    startedAt: new Date().toISOString(),
    ciUrl: null,
  }, requestId);
}

/**
 * GET /api/v1/build/trigger
 * 获取构建状态（预留）
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();
  const { searchParams } = new URL(request.url);
  const buildId = searchParams.get("buildId");

  if (!buildId) {
    return jsonError("Missing buildId parameter", 400, requestId);
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(buildId)) {
    return jsonError("Invalid buildId format", 400, requestId);
  }

  // mock: always return building
  return jsonSuccess({
    buildId,
    status: "building",
    progress: 50,
    requestedAt: new Date().toISOString(),
  }, requestId);
}

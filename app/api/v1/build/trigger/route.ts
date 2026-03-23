import { NextRequest, NextResponse } from "next/server";
import {
  requireElevatedRole,
  generateRequestId,
  jsonSuccess,
  jsonError,
  optionsResponse,
} from "@/lib/api-shared";

/** Allowed env values for build triggers */
const VALID_ENVS = new Set(["production", "staging", "development", "test"]);

/**
 * OPTIONS /api/v1/build/trigger
 * CORS preflight
 */
export { optionsResponse as OPTIONS };

/**
 * POST /api/v1/build/trigger
 * 触发构建任务 — 代理到 Express 后端
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  // Auth: require admin or vice_admin
  const authResult = requireElevatedRole(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

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

  // Proxy to Express backend
  const backendUrl = process.env.EXPRESS_BACKEND_URL || 'http://localhost:3001';
  try {
    const backendRes = await fetch(`${backendUrl}/api/v1/builds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({ versionId, versionName, env, buildId: generatedBuildId }),
    });
    const data = await backendRes.json();
    if (backendRes.ok && (data.code === 200 || data.code === 0)) {
      return jsonSuccess(data.data, requestId);
    }
    return jsonError(data.message || 'Backend build trigger failed', backendRes.status, requestId);
  } catch (err) {
    console.error('[POST /api/v1/build/trigger] Backend error:', err);
    return jsonError('触发构建失败，请稍后重试', 500, requestId);
  }
}

/**
 * GET /api/v1/build/trigger
 * 获取构建状态 — 代理到 Express 后端
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  // Auth: require any logged-in user
  const authResult = requireElevatedRole(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const buildId = searchParams.get("buildId");

  if (!buildId) {
    return jsonError("Missing buildId parameter", 400, requestId);
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(buildId)) {
    return jsonError("Invalid buildId format", 400, requestId);
  }

  // Proxy to Express backend
  const backendUrl = process.env.EXPRESS_BACKEND_URL || 'http://localhost:3001';
  try {
    const backendRes = await fetch(`${backendUrl}/api/v1/builds?buildId=${encodeURIComponent(buildId)}`, {
      headers: {
        'X-Request-ID': requestId,
        'Cookie': request.headers.get('cookie') || '',
      },
    });
    const data = await backendRes.json();
    if (backendRes.ok && (data.code === 200 || data.code === 0)) {
      return jsonSuccess(data.data, requestId);
    }
    return jsonError(data.message || 'Failed to get build status', backendRes.status, requestId);
  } catch (err) {
    console.error('[GET /api/v1/build/trigger] Backend error:', err);
    return jsonError('获取构建状态失败', 500, requestId);
  }
}

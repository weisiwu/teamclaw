import { NextRequest, NextResponse } from "next/server";
import { generateRequestId, jsonSuccess, optionsResponse, requireElevatedRole } from "@/lib/api-shared";

/**
 * GET /api/v1/build/stats
 * 返回构建统计信息 — 代理到 Express 后端
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  // Auth: require elevated role (admin or vice_admin)
  const authResult = requireElevatedRole(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  // Proxy to Express backend
  const backendUrl = process.env.EXPRESS_BACKEND_URL || 'http://localhost:3001';
  try {
    const res = await fetch(`${backendUrl}/api/v1/builds/stats`, {
      headers: {
        'X-Request-ID': requestId,
        'Cookie': request.headers.get('cookie') || '',
      },
    });
    const data = await res.json();
    return jsonSuccess(data.data || data, requestId);
  } catch (err) {
    console.error('[GET /api/v1/build/stats] Backend error:', err);
    return jsonSuccess({
      total: 0,
      success: 0,
      failed: 0,
      successRate: 0,
      avgDuration: 0,
    }, requestId);
  }
}

export { optionsResponse as OPTIONS };

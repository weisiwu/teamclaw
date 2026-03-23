import { NextRequest, NextResponse } from "next/server";
import { generateRequestId, jsonError, jsonSuccess, optionsResponse, requireElevatedRole } from "@/lib/api-shared";

/**
 * GET /api/v1/build/stats
 * 返回构建统计信息 — 需要 admin 或 vice_admin 权限
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  // Auth: require elevated role (admin or vice_admin)
  const authResult = requireElevatedRole(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  // Mock data: replace with real DB/Redis queries in production
  const stats = {
    total: 142,
    success: 128,
    failed: 14,
    successRate: parseFloat(((128 / 142) * 100).toFixed(2)),
    avgDuration: 317, // seconds
  };

  return jsonSuccess(stats, requestId);
}

export { optionsResponse as OPTIONS };

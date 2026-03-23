import { NextRequest, NextResponse } from "next/server";
import { requireElevatedRole } from "@/lib/api-shared";

/** CORS headers for cross-origin API access */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID, X-User-Id, X-User-Role",
  "Access-Control-Max-Age": "86400",
};

/** Generate a short unique request ID */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * OPTIONS /api/v1/build/stats
 * CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/v1/build/stats
 * 获取构建统计数据 — 需要 admin 或 vice_admin 权限
 *
 * Query params:
 *   - env?: "production" | "staging" | "development" | "test" (default: all)
 *   - branch?: string (default: all)
 *
 * Response:
 *   {
 *     total: number,
 *     success: number,
 *     failed: number,
 *     cancelled: number,
 *     successRate: number (percentage),
 *     avgDuration: number (seconds),
 *     byEnv: Record<string, { total, success, failed, successRate }>,
 *     recentTrend: number[] (last 7 days build counts)
 *   }
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  // Auth: require admin or vice_admin
  const authResult = requireElevatedRole(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const envFilter = searchParams.get("env");
  const branchFilter = searchParams.get("branch");

  // Mock build statistics — replace with actual DB queries when backend is ready
  const mockBuilds = [
    { id: "build_001", env: "production", branch: "main", status: "success", duration: 142, createdAt: "2026-03-22T10:00:00Z" },
    { id: "build_002", env: "production", branch: "main", status: "success", duration: 138, createdAt: "2026-03-22T09:00:00Z" },
    { id: "build_003", env: "staging", branch: "develop", status: "success", duration: 95, createdAt: "2026-03-22T08:30:00Z" },
    { id: "build_004", env: "production", branch: "main", status: "failed", duration: 67, createdAt: "2026-03-22T07:45:00Z" },
    { id: "build_005", env: "development", branch: "feature/x", status: "cancelled", duration: 12, createdAt: "2026-03-21T22:00:00Z" },
    { id: "build_006", env: "production", branch: "main", status: "success", duration: 155, createdAt: "2026-03-21T21:00:00Z" },
    { id: "build_007", env: "staging", branch: "develop", status: "failed", duration: 43, createdAt: "2026-03-21T20:00:00Z" },
    { id: "build_008", env: "production", branch: "release/v1.2", status: "success", duration: 160, createdAt: "2026-03-21T19:00:00Z" },
  ];

  // Apply filters
  let builds = mockBuilds;
  if (envFilter) builds = builds.filter((b) => b.env === envFilter);
  if (branchFilter) builds = builds.filter((b) => b.branch === branchFilter);

  const total = builds.length;
  const success = builds.filter((b) => b.status === "success").length;
  const failed = builds.filter((b) => b.status === "failed").length;
  const cancelled = builds.filter((b) => b.status === "cancelled").length;
  const successRate = total > 0 ? Math.round((success / total) * 100 * 10) / 10 : 0;

  const completedBuilds = builds.filter((b) => b.status !== "cancelled");
  const avgDuration =
    completedBuilds.length > 0
      ? Math.round(completedBuilds.reduce((sum, b) => sum + b.duration, 0) / completedBuilds.length)
      : 0;

  // By-env breakdown
  const envs = ["production", "staging", "development", "test"];
  const byEnv: Record<string, { total: number; success: number; failed: number; successRate: number }> = {};
  for (const env of envs) {
    const envBuilds = builds.filter((b) => b.env === env);
    const envSuccess = envBuilds.filter((b) => b.status === "success").length;
    const envTotal = envBuilds.length;
    byEnv[env] = {
      total: envTotal,
      success: envSuccess,
      failed: envBuilds.filter((b) => b.status === "failed").length,
      successRate: envTotal > 0 ? Math.round((envSuccess / envTotal) * 100 * 10) / 10 : 0,
    };
  }

  // Recent 7-day trend (mock: last 7 days build counts)
  const recentTrend = [8, 5, 12, 7, 9, 6, 10];

  return NextResponse.json(
    {
      code: 0,
      data: {
        total,
        success,
        failed,
        cancelled,
        successRate,
        avgDuration,
        byEnv,
        recentTrend,
      },
      requestId,
    },
    { headers: corsHeaders }
  );
}

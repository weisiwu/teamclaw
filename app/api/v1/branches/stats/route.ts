import { NextRequest, NextResponse } from "next/server";
import { generateRequestId, jsonSuccess, optionsResponse, requireAuth } from "@/lib/api-shared";
import { getAllBranches } from "@/lib/branch-store";

// GET /api/v1/branches/stats — 获取分支统计（需要身份认证）
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  // Auth: require authentication
  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  const all = getAllBranches();
  const stats = {
    total: all.length,
    main: all.filter(b => b.isMain).length,
    protected: all.filter(b => b.isProtected).length,
    remote: all.filter(b => b.isRemote).length,
  };
  return jsonSuccess(stats, requestId);
}

export { optionsResponse as OPTIONS };

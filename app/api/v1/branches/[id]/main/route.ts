import { NextRequest } from "next/server";
import { generateRequestId, jsonSuccess, jsonError, optionsResponse, requireAuth } from "@/lib/api-shared";
import { getBranch, getAllBranchesRaw } from "@/lib/branch-store";

// PUT /api/v1/branches/[id]/main — requires auth
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const branch = getBranch(id);
    if (!branch) return jsonError("分支不存在", 404, requestId);
    const all = getAllBranchesRaw();
    for (const b of all) { b.isMain = false; }
    branch.isMain = true;
    return jsonSuccess(branch, requestId);
  } catch (err) {
    return jsonError(`设置主分支失败: ${err instanceof Error ? err.message : String(err)}`, 500, requestId);
  }
}

export { optionsResponse as OPTIONS };

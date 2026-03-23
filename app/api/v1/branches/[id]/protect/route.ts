import { NextRequest } from "next/server";
import { generateRequestId, jsonSuccess, jsonError, optionsResponse, requireAuth } from "@/lib/api-shared";
import { getBranch, updateBranch } from "@/lib/branch-store";

// PUT /api/v1/branches/[id]/protect — requires auth
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await request.json() as { protected?: boolean };
    const branch = getBranch(id);
    if (!branch) return jsonError("分支不存在", 404, requestId);
    if (branch.isMain) return jsonError("无法修改主分支的保护状态", 403, requestId);
    const updated = updateBranch(id, { isProtected: body.protected ?? !branch.isProtected });
    return jsonSuccess(updated, requestId);
  } catch (err) {
    return jsonError(`设置保护状态失败: ${err instanceof Error ? err.message : String(err)}`, 500, requestId);
  }
}

export { optionsResponse as OPTIONS };

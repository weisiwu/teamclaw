import { NextRequest } from "next/server";
import { generateRequestId, jsonSuccess, jsonError, optionsResponse, requireAuth } from "@/lib/api-shared";
import { getBranch, updateBranch } from "@/lib/branch-store";

// PUT /api/v1/branches/[id]/rename — requires auth
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await request.json() as { newName?: string };
    const branch = getBranch(id);
    if (!branch) return jsonError("分支不存在", 404, requestId);
    if (branch.isMain) return jsonError("无法重命名主分支", 403, requestId);
    if (branch.isProtected) return jsonError("无法重命名已保护的分支", 403, requestId);
    const newName = body.newName;
    if (!newName || typeof newName !== "string") return jsonError("新名称不能为空", 400, requestId);
    if (!/^[a-zA-Z0-9_./-]+$/.test(newName)) return jsonError("分支名称只能包含字母、数字、_、.、/、-", 400, requestId);
    const updated = updateBranch(id, { name: newName });
    return jsonSuccess(updated, requestId);
  } catch (err) {
    return jsonError(`重命名分支失败: ${err instanceof Error ? err.message : String(err)}`, 500, requestId);
  }
}

export { optionsResponse as OPTIONS };

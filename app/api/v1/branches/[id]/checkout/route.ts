import { NextRequest } from "next/server";
import { generateRequestId, jsonSuccess, jsonError, optionsResponse } from "@/lib/api-shared";
import { getBranch, updateBranch } from "@/lib/branch-store";

// PUT /api/v1/branches/[id]/checkout — 检出（切换到）分支
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { id } = await params;
    const branch = getBranch(id);
    if (!branch) return jsonError("分支不存在", 404, requestId);
    updateBranch(id, { lastCommitAt: new Date().toISOString() });
    return jsonSuccess({ ...branch, lastCommitAt: new Date().toISOString() }, requestId);
  } catch (err) {
    return jsonError(`检出分支失败: ${err instanceof Error ? err.message : String(err)}`, 500, requestId);
  }
}

export { optionsResponse as OPTIONS };

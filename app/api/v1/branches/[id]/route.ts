import { NextRequest } from "next/server";
import { generateRequestId, jsonSuccess, jsonError, optionsResponse } from "@/lib/api-shared";
import { getBranch, getBranchByName, updateBranch, deleteBranch } from "@/lib/branch-store";

// GET /api/v1/branches/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { id } = await params;
    let branch = getBranch(id);
    if (!branch) branch = getBranchByName(id);
    if (!branch) return jsonError("分支不存在", 404, requestId);
    return jsonSuccess(branch, requestId);
  } catch (err) {
    return jsonError(`获取分支失败: ${err instanceof Error ? err.message : String(err)}`, 500, requestId);
  }
}

// PUT /api/v1/branches/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { id } = await params;
    const body = await request.json() as { description?: string; commitMessage?: string; author?: string };
    const branch = updateBranch(id, {
      ...(body.description !== undefined && { description: body.description }),
      ...(body.commitMessage !== undefined && { commitMessage: body.commitMessage }),
      ...(body.author !== undefined && { author: body.author }),
    });
    return jsonSuccess(branch, requestId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 400, requestId);
  }
}

// DELETE /api/v1/branches/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const { id } = await params;
    const result = deleteBranch(id);
    if (!result.deleted) return jsonError("分支不存在", 404, requestId);
    return jsonSuccess({ deleted: true }, requestId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 403, requestId);
  }
}

export { optionsResponse as OPTIONS };

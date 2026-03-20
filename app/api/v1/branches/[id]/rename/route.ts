import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
};

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function jsonSuccess(data: unknown, requestId?: string): NextResponse {
  return NextResponse.json({ code: 0, data, requestId }, { headers: { ...corsHeaders } });
}
function jsonError(message: string, status: number, requestId?: string): NextResponse {
  return NextResponse.json({ code: status, message, requestId }, { status });
}

interface GitBranch {
  id: string; name: string; isMain: boolean; isRemote: boolean; isProtected: boolean;
  createdAt: string; lastCommitAt: string; commitMessage: string; author: string;
  versionId?: string; description?: string;
}

const branchStore = new Map<string, GitBranch>();
let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;
  const now = new Date().toISOString();
  const main: GitBranch = {
    id: "branch_local_1", name: "main", isMain: true, isRemote: false, isProtected: true,
    createdAt: "2026-01-01T08:00:00Z", lastCommitAt: now, commitMessage: "Initial commit", author: "system",
  };
  branchStore.set(main.id, main);
  branchStore.set("main", main);
}

function getBranch(id: string): GitBranch | undefined {
  ensureInit();
  return branchStore.get(id) || branchStore.get(id.replace(/%2F/g, "/"));
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// PUT /api/v1/branches/[id]/rename — 重命名分支
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const { id } = await params;
    const body = await request.json() as { newName?: string };
    ensureInit();
    const branch = getBranch(id);
    if (!branch) return jsonError("分支不存在", 404, requestId);
    if (branch.isMain) return jsonError("无法重命名主分支", 403, requestId);
    if (branch.isProtected) return jsonError("无法重命名已保护的分支", 403, requestId);
    const newName = body.newName;
    if (!newName || typeof newName !== "string") return jsonError("新名称不能为空", 400, requestId);
    if (!/^[a-zA-Z0-9_./-]+$/.test(newName)) return jsonError("分支名称只能包含字母、数字、_、.、/、-", 400, requestId);
    branchStore.delete(branch.name);
    branch.name = newName;
    branchStore.set(branch.id, branch);
    branchStore.set(newName, branch);
    return jsonSuccess(branch, requestId);
  } catch (err) {
    return jsonError(`重命名分支失败: ${err instanceof Error ? err.message : String(err)}`, 500, requestId);
  }
}

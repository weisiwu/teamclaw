import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400",
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

// Shared store — imported from parent route's module scope
// Each route.ts is a separate module, so we re-declare a shared reference via a helper
declare const __branchStore: Map<string, unknown>;
declare const __getBranch: (id: string) => unknown;
declare const __branchStoreMap: Map<string, unknown>;

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Re-implement lightweight shared logic for [id] operations
// Since we can't import from sibling route.ts modules, we mirror the store logic

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

function getBranchByName(name: string): GitBranch | undefined {
  ensureInit();
  for (const b of branchStore.values()) { if (b.name === name) return b; }
  return undefined;
}

function updateBranch(id: string, data: Partial<GitBranch>): GitBranch {
  ensureInit();
  const branch = getBranch(id);
  if (!branch) throw new Error("Branch not found");
  Object.assign(branch, data);
  branchStore.set(branch.id, branch);
  return branch;
}

function deleteBranch(id: string): boolean {
  ensureInit();
  const branch = getBranch(id);
  if (!branch) return false;
  if (branch.isProtected) throw new Error("Cannot delete protected branch");
  if (branch.isMain) throw new Error("Cannot delete main branch");
  branchStore.delete(branch.id);
  branchStore.delete(branch.name);
  return true;
}

// GET /api/v1/branches/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const { id } = await params;
    ensureInit();
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
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const { id } = await params;
    const body = await request.json() as { description?: string; commitMessage?: string; author?: string };
    ensureInit();
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
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const { id } = await params;
    ensureInit();
    const deleted = deleteBranch(id);
    if (!deleted) return jsonError("分支不存在", 404, requestId);
    return jsonSuccess({ deleted: true }, requestId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 403, requestId);
  }
}

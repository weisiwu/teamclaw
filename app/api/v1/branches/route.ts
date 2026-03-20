import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400",
};

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function jsonSuccess(data: unknown, requestId?: string): NextResponse {
  return NextResponse.json({ code: 0, data, requestId }, {
    headers: { ...corsHeaders },
  });
}

function jsonError(message: string, status: number, requestId?: string): NextResponse {
  return NextResponse.json({ code: status, message, requestId }, { status });
}

// ========== Types ==========
interface GitBranch {
  id: string;
  name: string;
  isMain: boolean;
  isRemote: boolean;
  isProtected: boolean;
  createdAt: string;
  lastCommitAt: string;
  commitMessage: string;
  author: string;
  versionId?: string;
  description?: string;
}

// ========== In-memory store ==========
const branchStore = new Map<string, GitBranch>();
let currentBranchId = "branch_local_1";

function initStore() {
  if (branchStore.size > 0) return;
  const now = new Date().toISOString();
  const mainBranch: GitBranch = {
    id: "branch_local_1",
    name: "main",
    isMain: true,
    isRemote: false,
    isProtected: true,
    createdAt: "2026-01-01T08:00:00Z",
    lastCommitAt: now,
    commitMessage: "Initial commit",
    author: "system",
  };
  branchStore.set(mainBranch.id, mainBranch);
  branchStore.set("main", mainBranch);
}
initStore();

function getAllBranches(): GitBranch[] {
  return Array.from(branchStore.values()).filter(b => !b.name.startsWith("branch_local_"));
}

function getBranch(id: string): GitBranch | undefined {
  return branchStore.get(id) || branchStore.get(id.replace(/%2F/g, "/"));
}

function getBranchByName(name: string): GitBranch | undefined {
  for (const b of branchStore.values()) {
    if (b.name === name) return b;
  }
  return undefined;
}

function getMainBranch(): GitBranch | undefined {
  for (const b of branchStore.values()) {
    if (b.isMain) return b;
  }
  return undefined;
}

function getBranchStats() {
  const all = getAllBranches();
  return {
    total: all.length,
    main: all.filter(b => b.isMain).length,
    protected: all.filter(b => b.isProtected).length,
    remote: all.filter(b => b.isRemote).length,
  };
}

function createBranch(data: { name: string; author?: string; versionId?: string; baseBranch?: string; description?: string }): GitBranch {
  const now = new Date().toISOString();
  const base = data.baseBranch ? (getBranchByName(data.baseBranch) || getBranchByName("main")) : getBranchByName("main");
  const id = `branch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const branch: GitBranch = {
    id,
    name: data.name,
    isMain: false,
    isRemote: false,
    isProtected: false,
    createdAt: now,
    lastCommitAt: now,
    commitMessage: data.description || `Create branch ${data.name}`,
    author: data.author || "user",
    versionId: data.versionId,
    description: data.description,
  };
  branchStore.set(id, branch);
  branchStore.set(data.name, branch);
  return branch;
}

function deleteBranch(id: string): boolean {
  const branch = getBranch(id);
  if (!branch) return false;
  if (branch.isProtected) throw new Error("Cannot delete protected branch");
  if (branch.isMain) throw new Error("Cannot delete main branch");
  branchStore.delete(branch.id);
  branchStore.delete(branch.name);
  return true;
}

function setMainBranch(id: string): GitBranch {
  const branch = getBranch(id);
  if (!branch) throw new Error("Branch not found");
  // Unset current main
  for (const b of branchStore.values()) {
    if (b.isMain) b.isMain = false;
  }
  branch.isMain = true;
  return branch;
}

function setBranchProtection(id: string, isProtected: boolean): GitBranch {
  const branch = getBranch(id);
  if (!branch) throw new Error("Branch not found");
  if (branch.isMain) throw new Error("Cannot protect/unprotect main branch");
  branch.isProtected = isProtected;
  return branch;
}

function renameBranch(id: string, newName: string): GitBranch {
  const branch = getBranch(id);
  if (!branch) throw new Error("Branch not found");
  if (branch.isMain) throw new Error("Cannot rename main branch");
  if (branch.isProtected) throw new Error("Cannot rename protected branch");
  branchStore.delete(branch.name);
  branch.name = newName;
  branchStore.set(branch.id, branch);
  branchStore.set(newName, branch);
  return branch;
}

function checkoutBranch(id: string): GitBranch {
  const branch = getBranch(id);
  if (!branch) throw new Error("Branch not found");
  branch.lastCommitAt = new Date().toISOString();
  return branch;
}

// ========== Route Handlers ==========

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET /api/v1/branches
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const isMain = searchParams.get("isMain");
    const isProtected = searchParams.get("isProtected");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    let branches = getAllBranches();
    if (name) branches = branches.filter(b => b.name.includes(name));
    if (isMain !== null) branches = branches.filter(b => b.isMain === (isMain === "true"));
    if (isProtected !== null) branches = branches.filter(b => b.isProtected === (isProtected === "true"));

    const total = branches.length;
    const start = (page - 1) * pageSize;
    const data = branches.slice(start, start + pageSize);

    return jsonSuccess({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }, requestId);
  } catch (err) {
    return jsonError(`获取分支列表失败: ${err instanceof Error ? err.message : String(err)}`, 500, requestId);
  }
}

// POST /api/v1/branches
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const body = await request.json() as { name?: string; author?: string; versionId?: string; baseBranch?: string; description?: string };

    if (!body.name || typeof body.name !== "string") {
      return jsonError("分支名称不能为空", 400, requestId);
    }
    if (!/^[a-zA-Z0-9_./-]+$/.test(body.name)) {
      return jsonError("分支名称只能包含字母、数字、_、.、/、-", 400, requestId);
    }

    const branch = createBranch(body);
    return jsonSuccess(branch, requestId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 400, requestId);
  }
}

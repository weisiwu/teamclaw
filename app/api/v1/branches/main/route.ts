import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET /api/v1/branches/main — 获取主分支
export async function GET(): Promise<NextResponse> {
  const requestId = generateRequestId();
  ensureInit();
  for (const b of Array.from(branchStore.values())) {
    if (b.isMain) return jsonSuccess(b, requestId);
  }
  return jsonError("未找到主分支", 404, requestId);
}

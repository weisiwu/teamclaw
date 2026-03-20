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

// GET /api/v1/branches/stats — 获取分支统计
export async function GET(): Promise<NextResponse> {
  const requestId = generateRequestId();
  ensureInit();
  const all = Array.from(branchStore.values()).filter(b => !b.name.startsWith("branch_local_"));
  const stats = {
    total: all.length,
    main: all.filter(b => b.isMain).length,
    protected: all.filter(b => b.isProtected).length,
    remote: all.filter(b => b.isRemote).length,
  };
  return jsonSuccess(stats, requestId);
}

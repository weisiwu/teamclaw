import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
interface Version {
  id: string;
  version: string;
  branch: string;
  summary?: string;
  commitHash?: string;
  createdBy?: string;
  createdAt: string;
  buildStatus: 'pending' | 'building' | 'success' | 'failed';
  hasTag: boolean;
}

// ========== In-memory store ==========
const versionStore = new Map<string, Version>();

function initStore() {
  if (versionStore.size > 0) return;
  const now = new Date().toISOString();
  const sampleVersions: Version[] = [
    { id: "v1", version: "1.0.0", branch: "main", summary: "Initial release", commitHash: "abc1234", createdBy: "system", createdAt: now, buildStatus: "success", hasTag: true },
    { id: "v2", version: "1.1.0", branch: "main", summary: "Feature update", commitHash: "def5678", createdBy: "coder", createdAt: now, buildStatus: "success", hasTag: true },
    { id: "v3", version: "2.0.0", branch: "main", summary: "Major release", commitHash: "ghi9012", createdBy: "pm", createdAt: now, buildStatus: "building", hasTag: false },
  ];
  sampleVersions.forEach(v => versionStore.set(v.id, v));
}
initStore();

export { versionStore };

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/v1/versions
 * List all versions with pagination and filtering
 *
 * Query params:
 *   page     - page number (default: 1)
 *   pageSize - items per page (default: 20, max: 100)
 *   status   - filter by build_status: pending | building | success | failed
 *   branch   - filter by branch name
 *   search   - search in version/branch fields
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const status = searchParams.get("status");
    const branch = searchParams.get("branch");
    const search = searchParams.get("search");
    const offset = (page - 1) * pageSize;

    let versions = Array.from(versionStore.values());

    // Apply filters
    if (status && ['pending', 'building', 'success', 'failed'].includes(status)) {
      versions = versions.filter(v => v.buildStatus === status);
    }
    if (branch) {
      versions = versions.filter(v => v.branch === branch);
    }
    if (search) {
      const q = search.toLowerCase();
      versions = versions.filter(v =>
        v.version.toLowerCase().includes(q) ||
        v.branch.toLowerCase().includes(q) ||
        (v.summary && v.summary.toLowerCase().includes(q))
      );
    }

    // Sort by createdAt desc
    versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = versions.length;
    const totalPages = Math.ceil(total / pageSize);
    const list = versions.slice(offset, offset + pageSize);

    return jsonSuccess({ list, total, page, pageSize, totalPages }, requestId);

  } catch (err) {
    console.error("[v1/versions] Error:", err);
    return jsonError("Failed to fetch versions", 500, requestId);
  }
}

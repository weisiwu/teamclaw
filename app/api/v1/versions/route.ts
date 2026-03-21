import { NextRequest, NextResponse } from "next/server";
import { versionStore, type Version } from "./version-store";

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

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/v1/versions
 * List all versions with pagination and filtering
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const status = searchParams.get("status");
    const branch = searchParams.get("branch");
    const search = searchParams.get("search");

    let versions = Array.from(versionStore.values()) as Version[];

    // Apply filters
    if (status) {
      versions = versions.filter(v => v.buildStatus === status);
    }
    if (branch) {
      versions = versions.filter(v => v.branch === branch);
    }
    if (search) {
      const q = search.toLowerCase();
      versions = versions.filter(v =>
        v.version.toLowerCase().includes(q) ||
        v.summary?.toLowerCase().includes(q) ||
        v.commitHash?.toLowerCase().includes(q)
      );
    }

    // Sort by createdAt descending
    versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const total = versions.length;
    const start = (page - 1) * pageSize;
    const paginatedVersions = versions.slice(start, start + pageSize);

    return jsonSuccess({
      items: paginatedVersions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }, requestId);
  } catch (err) {
    console.error("[versions]", err);
    return jsonError("Internal server error", 500, requestId);
  }
}

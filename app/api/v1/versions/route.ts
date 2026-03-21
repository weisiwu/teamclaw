import { NextRequest } from "next/server";
import { versionStore, type Version } from "./version-store";
import { corsHeaders, generateRequestId, jsonSuccess, jsonError, optionsResponse } from "@/lib/api-shared";

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

    versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

export { optionsResponse as OPTIONS };

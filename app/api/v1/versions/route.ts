import { NextRequest, NextResponse } from "next/server";
import { versionStore, type Version } from "./version-store";
import { generateRequestId, jsonSuccess, jsonError, handleApiError, optionsResponse, requireAuth, corsHeaders } from "@/lib/api-shared";

// ETag + Cache-Control constants (aligned with iter-87 server-side pattern)
const CACHE_MAX_AGE = 60;        // 60s browser cache
const STALE_WHILE_REVALIDATE = 120; // serve stale up to 120s while revalidating

/**
 * Generate a weak ETag from the list response data.
 * Uses total + page info and boundary version IDs for a stable, cheap hash.
 */
function buildVersionsETag(
  total: number,
  page: number,
  pageSize: number,
  paginatedVersions: Version[]
): string {
  const first = paginatedVersions[0]?.id ?? "";
  const last = paginatedVersions[paginatedVersions.length - 1]?.id ?? "";
  const raw = `${total}-${page}-${pageSize}-${first}-${last}`;
  // Weak validator (W/) — good enough for conditional GET on mutable store data
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return `W/"${Math.abs(hash).toString(16)}"`;
}

/**
 * GET /api/v1/versions
 * List all versions with pagination and filtering.
 * Supports conditional requests via If-None-Match / ETag.
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
    // iter69-change-tracking filters
    const hasScreenshot = searchParams.get("hasScreenshot");
    const hasSummary = searchParams.get("hasSummary");

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
        v.commitHash?.toLowerCase().includes(q) ||
        v.title?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q) ||
        (v.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
    }
    // Filter by hasScreenshot (iter69): ?hasScreenshot=true returns only versions with screenshots
    if (hasScreenshot === "true") {
      versions = versions.filter(v => v.hasScreenshot === true);
    } else if (hasScreenshot === "false") {
      versions = versions.filter(v => !v.hasScreenshot);
    }
    // Filter by hasSummary/changelog (iter69): ?hasSummary=true returns only versions with changelogs
    if (hasSummary === "true") {
      versions = versions.filter(v => v.hasSummary === true);
    } else if (hasSummary === "false") {
      versions = versions.filter(v => !v.hasSummary);
    }

    versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = versions.length;
    const start = (page - 1) * pageSize;
    const paginatedVersions = versions.slice(start, start + pageSize);

    // ETag + conditional request (iter-98 API optimization)
    const etag = buildVersionsETag(total, page, pageSize, paginatedVersions);
    const ifNoneMatch = request.headers.get("If-None-Match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { ...corsHeaders, ETag: etag },
      });
    }

    const cacheHeaders = {
      ...corsHeaders,
      "Cache-Control": `private, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
      ETag: etag,
    };

    return jsonSuccess({
      data: paginatedVersions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }, requestId, 200, cacheHeaders);
  } catch (err) {
    console.error("[versions]", err);
    return jsonError("Internal server error", 500, requestId);
  }
}

/**
 * POST /api/v1/versions
 * Create a new version (requires auth)
 * Body: { version, branch, summary?, title?, description?, tags?, gitTag? }
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json() as Partial<Version>;

    if (!body.version || !body.branch) {
      return jsonError("version and branch are required", 400, requestId);
    }

    // Check for duplicate version ID
    const normalizedId = body.version.replace(/^v/, "");
    if (versionStore.has(normalizedId) || versionStore.has(body.version)) {
      return jsonError(`Version ${body.version} already exists`, 409, requestId);
    }

    const now = new Date().toISOString();
    const newVersion: Version = {
      id: body.version.replace(/^v/, ""),
      version: body.version.startsWith("v") ? body.version : `v${body.version}`,
      branch: body.branch,
      summary: body.summary,
      title: body.title,
      description: body.description,
      tags: body.tags || [],
      gitTag: body.gitTag,
      commitHash: body.commitHash,
      createdBy: body.createdBy,
      createdAt: now,
      buildStatus: body.buildStatus || "pending",
      hasTag: body.gitTag ? true : false,
      hasScreenshot: body.hasScreenshot || false,
      hasSummary: body.hasSummary || false,
      status: body.status || "draft",
      releasedAt: null,
    };

    versionStore.set(newVersion.id, newVersion);

    return jsonSuccess(newVersion, requestId, 201);
  } catch (err) {
    console.error("[versions POST]", err);
    return handleApiError(err, requestId);
  }
}

export { optionsResponse as OPTIONS };

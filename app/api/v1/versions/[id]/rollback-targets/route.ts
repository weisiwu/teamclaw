import { NextRequest } from "next/server";
import { versionStore } from "../../version-store";
import { generateRequestId, jsonSuccess, jsonError, optionsResponse } from "@/lib/api-shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/versions/[id]/rollback-targets
 * List available rollback targets (previous versions) for a given version.
 * Returns a list of versions that can be rolled back to.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();
  try {
    const { id } = await context.params;
    const current = versionStore.get(id);
    if (!current) {
      return jsonError("Version not found", 404, requestId);
    }

    // Get all versions on the same branch, sorted by creation date descending
    const allVersions = Array.from(versionStore.values())
      .filter(v => v.branch === current.branch && v.id !== id && v.buildStatus === "success")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const targets = allVersions.map(v => ({
      id: v.id,
      version: v.version,
      commitHash: v.commitHash,
      summary: v.summary,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      isTag: v.hasTag,
      // Distance in semver terms — simplified: compare patch versions
      distance: 0,
    }));

    return jsonSuccess({
      currentVersion: { id: current.id, version: current.version },
      targets,
      total: targets.length,
    }, requestId);
  } catch (err) {
    console.error("[versions/[id]/rollback-targets GET]", err);
    return jsonError("Internal server error", 500, requestId);
  }
}

export { optionsResponse as OPTIONS };

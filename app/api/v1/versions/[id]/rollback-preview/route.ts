import { NextRequest } from "next/server";
import { versionStore } from "../../version-store";
import { generateRequestId, jsonSuccess, jsonError, optionsResponse } from "@/lib/api-shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/versions/[id]/rollback-preview?ref=<targetVersionId>
 * Preview the changes that would be applied during a rollback.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref");

    if (!ref) {
      return jsonError("ref query parameter is required", 400, requestId);
    }

    const current = versionStore.get(id);
    if (!current) {
      return jsonError("Current version not found", 404, requestId);
    }

    const target = versionStore.get(ref);
    if (!target) {
      return jsonError("Target version not found", 404, requestId);
    }

    const preview = {
      current: {
        id: current.id,
        version: current.version,
        commitHash: current.commitHash,
        summary: current.summary,
        buildStatus: current.buildStatus,
        createdAt: current.createdAt,
      },
      target: {
        id: target.id,
        version: target.version,
        commitHash: target.commitHash,
        summary: target.summary,
        buildStatus: target.buildStatus,
        createdAt: target.createdAt,
      },
      changes: {
        summaryDelta: target.summary !== current.summary ? target.summary : null,
        commitDelta: target.commitHash !== current.commitHash ? target.commitHash : null,
        branchUnchanged: target.branch === current.branch,
      },
      warnings: [] as string[],
    };

    // Add warnings
    if (target.buildStatus !== "success") {
      preview.warnings.push(`Target version ${target.version} has build status: ${target.buildStatus}`);
    }
    if (target.branch !== current.branch) {
      preview.warnings.push(`Rollback will switch branch from ${current.branch} to ${target.branch}`);
    }

    return jsonSuccess(preview, requestId);
  } catch (err) {
    console.error("[versions/[id]/rollback-preview GET]", err);
    return jsonError("Internal server error", 500, requestId);
  }
}

export { optionsResponse as OPTIONS };

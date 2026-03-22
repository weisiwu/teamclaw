import { NextRequest, NextResponse } from "next/server";

/** Backend server URL — proxy to the Node.js backend on port 9700 */
const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:9700";

/** CORS headers for cross-origin API access */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400",
};

/** Generate a short unique request ID */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Transform backend VersionSummary format to frontend VersionChangelog format.
 */
function transformToFrontend(data: Record<string, unknown>): Record<string, unknown> {
  const changes_detail = data.changes_detail as Array<{ type: string; description: string; files?: string[] }> | undefined;
  const changes = changes_detail && changes_detail.length > 0
    ? changes_detail
    : [
        ...((data.features as string[] || []).map((d: string) => ({ type: "feature", description: d }))),
        ...((data.fixes as string[] || []).map((d: string) => ({ type: "fix", description: d }))),
        ...((data.changes as string[] || []).map((d: string) => ({ type: "improvement", description: d }))),
        ...((data.breaking as string[] || []).map((d: string) => ({ type: "breaking", description: d }))),
      ];

  return {
    id: data.id,
    versionId: data.versionId,
    title: data.title || "",
    content: data.content || "",
    changes,
    generatedAt: data.generatedAt || data.generated_at || new Date().toISOString(),
    generatedBy: data.generatedBy || data.generated_by || "system",
  };
}

/**
 * GET /api/v1/versions/changelog/diff?from=versionId&to=versionId
 * Compare changelogs between two versions
 */
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const { searchParams } = new URL(req.url);
  const fromId = searchParams.get("from");
  const toId = searchParams.get("to");

  if (!fromId || !toId) {
    return NextResponse.json(
      { code: 400, message: "from 和 to 版本 ID 都不能为空", requestId },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    // Fetch both changelogs in parallel from the backend
    const [fromResp, toResp] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/versions/${fromId}/summary`, {
        headers: {
          "X-Request-ID": requestId,
          "Content-Type": "application/json",
        },
      }),
      fetch(`${BACKEND_URL}/api/v1/versions/${toId}/summary`, {
        headers: {
          "X-Request-ID": requestId,
          "Content-Type": "application/json",
        },
      }),
    ]);

    const [fromData, toData] = await Promise.all([
      fromResp.json() as Promise<Record<string, unknown>>,
      toResp.json() as Promise<Record<string, unknown>>,
    ]);

    const fromSummary = fromData.data as Record<string, unknown> | undefined;
    const toSummary = toData.data as Record<string, unknown> | undefined;

    if (!fromSummary) {
      return NextResponse.json(
        { code: 404, message: `版本 ${fromId} 的变更摘要不存在`, requestId },
        { status: 404, headers: corsHeaders }
      );
    }
    if (!toSummary) {
      return NextResponse.json(
        { code: 404, message: `版本 ${toId} 的变更摘要不存在`, requestId },
        { status: 404, headers: corsHeaders }
      );
    }

    // Build diff
    const transform = transformToFrontend;
    const fromChangelog = transform(fromSummary);
    const toChangelog = transform(toSummary);

    // Categorize changes by type
    type ChangeType = "feature" | "fix" | "improvement" | "breaking" | "docs" | "refactor" | "other";
    const categorize = (changes: Array<{ type: string; description: string }>) => {
      const cats: Record<ChangeType, string[]> = {
        feature: [], fix: [], improvement: [], breaking: [], docs: [], refactor: [], other: [],
      };
      for (const c of changes) {
        const t = c.type as ChangeType;
        if (cats[t]) cats[t].push(c.description);
      }
      return cats;
    };

    const fromChanges = fromChangelog.changes as Array<{ type: string; description: string }>;
    const toChanges = toChangelog.changes as Array<{ type: string; description: string }>;
    const fromCats = categorize(fromChanges);
    const toCats = categorize(toChanges);

    // Compute diff: items only in from, items only in to
    const diff: Record<ChangeType, { added: string[]; removed: string[] }> = {} as Record<ChangeType, { added: string[]; removed: string[] }>;
    for (const type of ["feature", "fix", "improvement", "breaking", "docs", "refactor", "other"] as ChangeType[]) {
      const fromSet = new Set(fromCats[type]);
      const toSet = new Set(toCats[type]);
      const added: string[] = [];
      const removed: string[] = [];
      for (const item of toSet) if (!fromSet.has(item)) added.push(item);
      for (const item of fromSet) if (!toSet.has(item)) removed.push(item);
      diff[type] = { added, removed };
    }

    return NextResponse.json({
      code: 0,
      data: {
        from: { versionId: fromId, changelog: fromChangelog },
        to: { versionId: toId, changelog: toChangelog },
        diff,
        summary: {
          totalFrom: fromChanges.length,
          totalTo: toChanges.length,
          addedCount: Object.values(diff).reduce((s, d) => s + d.added.length, 0),
          removedCount: Object.values(diff).reduce((s, d) => s + d.removed.length, 0),
        },
      },
      requestId,
    }, { headers: corsHeaders });
  } catch (err) {
    console.error("[changelog/diff] Error:", err);
    return NextResponse.json(
      { code: 503, message: "Backend server unavailable or diff computation failed", requestId },
      { status: 503, headers: corsHeaders }
    );
  }
}

/**
 * OPTIONS /api/v1/versions/changelog/diff
 * CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

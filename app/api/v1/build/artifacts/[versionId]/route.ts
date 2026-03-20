import { NextRequest, NextResponse } from "next/server";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:9700";

/**
 * GET /api/v1/build/artifacts/[versionId]
 * Proxy to Express server artifact API: GET /api/v1/artifacts/:versionId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const { versionId } = await params;
  const { searchParams } = new URL(request.url);
  const buildNumber = searchParams.get("buildNumber");

  if (!versionId) {
    return NextResponse.json(
      { code: 400, message: "Missing versionId parameter" },
      { status: 400 }
    );
  }

  try {
    const url = buildNumber
      ? `${SERVER_URL}/api/v1/artifacts/${encodeURIComponent(versionId)}/${encodeURIComponent(buildNumber)}`
      : `${SERVER_URL}/api/v1/artifacts/${encodeURIComponent(versionId)}`;

    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { code: response.status, message: "Failed to fetch artifacts from server" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ code: 0, data });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    // 区分超时错误和网络错误，提供更精确的错误信息
    if (err.name === "TimeoutError" || err.message?.includes("timeout")) {
      console.error(`[ArtifactsProxy] Timeout reaching ${SERVER_URL}:`, error);
      return NextResponse.json(
        { code: 504, message: "Artifact server timeout, please retry later" },
        { status: 504 }
      );
    }
    console.error("[ArtifactsProxy] Error:", error);
    return NextResponse.json(
      { code: 503, message: "Artifact server unreachable" },
      { status: 503 }
    );
  }
}

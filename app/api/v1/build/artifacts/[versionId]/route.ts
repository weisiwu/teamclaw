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
    return NextResponse.json(data);
  } catch (error) {
    console.error("[ArtifactsProxy] Error:", error);
    return NextResponse.json(
      { code: 500, message: "Proxy error: unable to reach artifact server" },
      { status: 500 }
    );
  }
}

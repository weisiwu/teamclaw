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

  // Validate versionId format to prevent path traversal
  if (!/^[a-zA-Z0-9_.-]+$/.test(versionId)) {
    return NextResponse.json(
      { code: 400, message: "Invalid versionId format" },
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

/**
 * DELETE /api/v1/build/artifacts/[versionId]
 * Delete all artifacts for a specific version (proxies to server)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const { versionId } = await params;

  if (!versionId) {
    return NextResponse.json(
      { code: 400, message: "Missing versionId parameter" },
      { status: 400 }
    );
  }

  // Only allow alphanumeric, dash, underscore, dot (prevent path traversal)
  if (!/^[a-zA-Z0-9_.-]+$/.test(versionId)) {
    return NextResponse.json(
      { code: 400, message: "Invalid versionId format" },
      { status: 400 }
    );
  }

  try {
    const url = `${SERVER_URL}/api/v1/artifacts/${encodeURIComponent(versionId)}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { code: response.status, message: errData.message || "Failed to delete artifacts" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ code: 0, data });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === "TimeoutError" || err.message?.includes("timeout")) {
      console.error(`[ArtifactsProxy] DELETE timeout reaching ${SERVER_URL}:`, error);
      return NextResponse.json(
        { code: 504, message: "Artifact server timeout, please retry later" },
        { status: 504 }
      );
    }
    console.error("[ArtifactsProxy] DELETE Error:", error);
    return NextResponse.json(
      { code: 503, message: "Artifact server unreachable" },
      { status: 503 }
    );
  }
}

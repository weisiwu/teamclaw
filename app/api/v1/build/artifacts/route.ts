import path from "path";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  generateRequestId,
  jsonSuccess,
  jsonError,
  optionsResponse,
  corsHeaders,
} from "@/lib/api-shared";

export { optionsResponse as OPTIONS };

export interface BuildArtifact {
  filename: string;
  versionName: string;
  env: string;
  platform: string;
  arch: string;
  size: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string;
}

/**
 * Get artifact storage directory for a version
 */
function getVersionArtifactDir(versionName: string): string {
  return path.join(ARTIFACTS_DIR, versionName.replace(/[^a-zA-Z0-9.-]/g, "_"));
}

/**
 * Format file size to human readable string
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Parse artifact filename to extract metadata
 * Format: teamclaw-{version}-{platform}-{arch}.{ext}
 */
function parseArtifactFilename(filename: string): {
  versionName: string;
  env: string;
  platform: string;
  arch: string;
} | null {
  const match = filename.match(/^teamclaw-(.+)-(\w+)-(\w+)\.(tar\.gz|zip)$/);
  if (!match) return null;
  return {
    versionName: match[1],
    env: "production",
    platform: match[2],
    arch: match[3],
  };
}

const ARTIFACTS_DIR = path.join(process.cwd(), "public", "build-artifacts");

/**
 * List all artifacts for a given version
 * GET /api/v1/build/artifacts?versionName=v1.2.0&page=1&pageSize=20
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();
  const { searchParams } = new URL(request.url);
  const versionName = searchParams.get("versionName");

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

  try {
    await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

    const artifacts: BuildArtifact[] = [];

    if (versionName) {
      const versionDir = getVersionArtifactDir(versionName);
      try {
        const files = await fs.readdir(versionDir);
        for (const filename of files) {
          const filePath = path.join(versionDir, filename);
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            const parsed = parseArtifactFilename(filename);
            artifacts.push({
              filename,
              versionName: parsed?.versionName || versionName,
              env: parsed?.env || "production",
              platform: parsed?.platform || "unknown",
              arch: parsed?.arch || "unknown",
              size: formatSize(stat.size),
              sizeBytes: stat.size,
              createdAt: stat.birthtime.toISOString(),
              downloadUrl: `/build-artifacts/${versionName.replace(/[^a-zA-Z0-9.-]/g, "_")}/${filename}`,
            });
          }
        }
      } catch {
        // Version dir doesn't exist, return empty
      }
    } else {
      const entries = await fs.readdir(ARTIFACTS_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const versionDir = path.join(ARTIFACTS_DIR, entry.name);
          const files = await fs.readdir(versionDir);
          for (const filename of files) {
            const filePath = path.join(versionDir, filename);
            const stat = await fs.stat(filePath);
            if (stat.isFile()) {
              const parsed = parseArtifactFilename(filename);
              artifacts.push({
                filename,
                versionName: parsed?.versionName || entry.name,
                env: parsed?.env || "production",
                platform: parsed?.platform || "unknown",
                arch: parsed?.arch || "unknown",
                size: formatSize(stat.size),
                sizeBytes: stat.size,
                createdAt: stat.birthtime.toISOString(),
                downloadUrl: `/build-artifacts/${entry.name}/${filename}`,
              });
            }
          }
        }
      }
    }

    artifacts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = artifacts.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedArtifacts = artifacts.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      code: 0,
      data: {
        artifacts: paginatedArtifacts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      requestId,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("[BuildArtifacts] Error:", error);
    return jsonError("Internal server error", 500, requestId);
  }
}

/**
 * Delete a build artifact
 * DELETE /api/v1/build/artifacts?filename=teamclaw-v1.0.0-darwin-arm64.tar.gz&versionName=v1.0.0
 */
export async function DELETE(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');
  const versionName = searchParams.get('versionName');

  if (!filename || !versionName) {
    return jsonError('Missing filename or versionName', 400, requestId);
  }

  try {
    const versionDir = getVersionArtifactDir(versionName);
    const filePath = path.join(versionDir, filename);

    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return jsonError('Artifact not found', 404, requestId);
      }
      throw err;
    }

    const remaining = await fs.readdir(versionDir);
    if (remaining.length === 0) {
      await fs.rmdir(versionDir);
    }

    return jsonSuccess({ filename, versionName }, requestId);
  } catch (error) {
    console.error('[BuildArtifacts] Delete error:', error);
    return jsonError('Failed to delete artifact', 500, requestId);
  }
}

/**
 * Upload a build artifact
 * POST /api/v1/build/artifacts
 * Body: FormData with file, versionName, env, platform, arch
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const versionName = formData.get("versionName") as string | null;
    const platform = (formData.get("platform") as string) || "unknown";
    const arch = (formData.get("arch") as string) || "unknown";

    if (!file || !versionName) {
      return jsonError("Missing file or versionName", 400, requestId);
    }

    // Validate versionName format to prevent path traversal
    if (!/^[a-zA-Z0-9_.-]+$/.test(versionName)) {
      return jsonError("Invalid versionName format (only alphanumeric, dash, underscore, dot allowed)", 400, requestId);
    }

    // File size limit: 500MB
    const MAX_FILE_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return jsonError(`File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`, 413, requestId);
    }

    const versionDir = getVersionArtifactDir(versionName);
    await fs.mkdir(versionDir, { recursive: true });

    const ext = file.name.endsWith(".zip") ? ".zip" : ".tar.gz";
    const filename = `teamclaw-${versionName}-${platform}-${arch}${ext}`;
    const filePath = path.join(versionDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const stat = await fs.stat(filePath);

    return jsonSuccess({
      filename,
      size: formatSize(stat.size),
      sizeBytes: stat.size,
      downloadUrl: `/build-artifacts/${versionName.replace(/[^a-zA-Z0-9.-]/g, "_")}/${filename}`,
      createdAt: stat.birthtime.toISOString(),
    } as BuildArtifact, requestId);
  } catch (error) {
    console.error("[BuildArtifacts] Upload error:", error);
    return jsonError("Internal server error", 500, requestId);
  }
}

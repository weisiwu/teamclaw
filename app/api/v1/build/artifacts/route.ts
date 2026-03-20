import path from "path";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";

const ARTIFACTS_DIR = path.join(process.cwd(), "public", "build-artifacts");

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
  // teamclaw-v1.2.0-darwin-arm64.tar.gz
  // teamclaw-v1.2.0-darwin-x64.tar.gz
  // teamclaw-v1.2.0-linux-arm64.tar.gz
  // teamclaw-v1.2.0-windows-x64.zip
  const match = filename.match(
    /^teamclaw-(.+)-(\w+)-(\w+)\.(tar\.gz|zip)$/
  );
  if (!match) return null;
  return {
    versionName: match[1],
    env: "production", // default env
    platform: match[2],
    arch: match[3],
  };
}

/**
 * List all artifacts for a given version
 * GET /api/v1/build/artifacts?versionName=v1.2.0
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const versionName = searchParams.get("versionName");

  try {
    await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

    const artifacts: BuildArtifact[] = [];

    if (versionName) {
      // List artifacts for specific version
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
      // List all versions that have artifacts
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

    // Sort by creation time descending
    artifacts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      code: 0,
      data: { artifacts, total: artifacts.length },
    });
  } catch (error) {
    console.error("[BuildArtifacts] Error:", error);
    return NextResponse.json(
      { code: 500, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Delete a build artifact
 * DELETE /api/v1/build/artifacts?filename=teamclaw-v1.0.0-darwin-arm64.tar.gz&versionName=v1.0.0
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');
  const versionName = searchParams.get('versionName');

  if (!filename || !versionName) {
    return NextResponse.json(
      { code: 400, message: 'Missing filename or versionName' },
      { status: 400 }
    );
  }

  try {
    const versionDir = getVersionArtifactDir(versionName);
    const filePath = path.join(versionDir, filename);

    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json(
          { code: 404, message: 'Artifact not found' },
          { status: 404 }
        );
      }
      throw err;
    }

    // 检查版本目录是否为空，空则删除目录
    const remaining = await fs.readdir(versionDir);
    if (remaining.length === 0) {
      await fs.rmdir(versionDir);
    }

    return NextResponse.json({
      code: 0,
      message: 'ok',
      data: { filename, versionName },
    });
  } catch (error) {
    console.error('[BuildArtifacts] Delete error:', error);
    return NextResponse.json(
      { code: 500, message: 'Failed to delete artifact' },
      { status: 500 }
    );
  }
}

/**
 * Upload a build artifact
 * POST /api/v1/build/artifacts
 * Body: FormData with file, versionName, env, platform, arch
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const versionName = formData.get("versionName") as string | null;
    // env available for future use: (formData.get("env") as string) || "production"
    const platform = (formData.get("platform") as string) || "unknown";
    const arch = (formData.get("arch") as string) || "unknown";

    if (!file || !versionName) {
      return NextResponse.json(
        { code: 400, message: "Missing file or versionName" },
        { status: 400 }
      );
    }

    const versionDir = getVersionArtifactDir(versionName);
    await fs.mkdir(versionDir, { recursive: true });

    // Generate filename if not provided
    const ext = file.name.endsWith(".zip") ? ".zip" : ".tar.gz";
    const filename = `teamclaw-${versionName}-${platform}-${arch}${ext}`;
    const filePath = path.join(versionDir, filename);

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const stat = await fs.stat(filePath);

    return NextResponse.json({
      code: 0,
      data: {
        filename,
        size: formatSize(stat.size),
        sizeBytes: stat.size,
        downloadUrl: `/build-artifacts/${versionName.replace(/[^a-zA-Z0-9.-]/g, "_")}/${filename}`,
        createdAt: stat.birthtime.toISOString(),
      } as BuildArtifact,
    });
  } catch (error) {
    console.error("[BuildArtifacts] Upload error:", error);
    return NextResponse.json(
      { code: 500, message: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

/** Allowed env values for build triggers */
const VALID_ENVS = new Set(["production", "staging", "development", "test"]);

/**
 * POST /api/v1/build/trigger
 * 触发构建任务
 */
export async function POST(request: NextRequest) {
  // 验证 Content-Type
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { code: 415, message: "Content-Type must be application/json" },
      { status: 415 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 400, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { versionId, versionName, env, buildId } = body;

  if (!versionId || typeof versionId !== "string") {
    return NextResponse.json(
      { code: 400, message: "Missing or invalid versionId" },
      { status: 400 }
    );
  }
  if (!versionName || typeof versionName !== "string") {
    return NextResponse.json(
      { code: 400, message: "Missing or invalid versionName" },
      { status: 400 }
    );
  }
  if (!env || typeof env !== "string" || !VALID_ENVS.has(env)) {
    return NextResponse.json(
      { code: 400, message: `Missing or invalid env. Must be one of: ${[...VALID_ENVS].join(", ")}` },
      { status: 400 }
    );
  }

  const generatedBuildId = buildId || `build-${Date.now()}`;

  // 目前是 mock 实现，记录构建任务
  // 实际实现应该调用 CI/CD 系统（如 GitHub Actions, Jenkins 等）
  console.log(`[Build Trigger] buildId=${generatedBuildId}, version=${versionName}, env=${env}`);

  return NextResponse.json({
    code: 0,
    data: {
      buildId: generatedBuildId,
      versionId,
      versionName,
      env,
      status: "building",
      startedAt: new Date().toISOString(),
      ciUrl: null,
    },
  });
}

/**
 * GET /api/v1/build/trigger
 * 获取构建状态（预留）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const buildId = searchParams.get("buildId");

  if (!buildId) {
    return NextResponse.json(
      { code: 400, message: "Missing buildId" },
      { status: 400 }
    );
  }

  // mock: 总是返回 building
  return NextResponse.json({
    code: 0,
    data: {
      buildId,
      status: "building",
      progress: 50,
    },
  });
}

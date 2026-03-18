import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/build/trigger
 * 触发构建任务
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { versionId, versionName, env, buildId } = body;

    if (!versionId || !versionName || !env) {
      return NextResponse.json(
        { code: 400, message: "Missing required fields: versionId, versionName, env" },
        { status: 400 }
      );
    }

    // 目前是 mock 实现，记录构建任务
    // 实际实现应该调用 CI/CD 系统（如 GitHub Actions, Jenkins 等）
    console.log(`[Build Trigger] buildId=${buildId}, version=${versionName}, env=${env}`);

    return NextResponse.json({
      code: 0,
      data: {
        buildId: buildId || `build-${Date.now()}`,
        versionId,
        versionName,
        env,
        status: "building",
        startedAt: new Date().toISOString(),
        // 预留 CI URL 字段
        ciUrl: null,
      },
    });
  } catch (error) {
    console.error("[Build Trigger] Error:", error);
    return NextResponse.json(
      { code: 500, message: "Internal server error" },
      { status: 500 }
    );
  }
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

import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400",
};

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function jsonSuccess(data: unknown, requestId?: string): NextResponse {
  return NextResponse.json({ code: 0, data, requestId }, {
    headers: { ...corsHeaders },
  });
}

function jsonError(message: string, status: number, requestId?: string): NextResponse {
  return NextResponse.json({ code: status, message, requestId }, { status });
}

/** In-memory changelog store (keyed by versionId) */
interface VersionChangelog {
  id: string;
  versionId: string;
  title: string;
  content: string;
  changes: ChangelogChange[];
  generatedAt: string;
  generatedBy: string;
}

interface ChangelogChange {
  type: "feature" | "fix" | "improvement" | "breaking" | "docs" | "refactor" | "other";
  description: string;
  files?: string[];
}

const changelogStore = new Map<string, VersionChangelog>();

// Pre-populate with sample data
changelogStore.set("v1", {
  id: "cl-1",
  versionId: "v1",
  title: "v1.0.0 变更日志",
  content: "初始版本发布，包含核心功能",
  changes: [
    { type: "feature", description: "任务管理基础功能", files: ["app/tasks/page.tsx", "lib/api/tasks.ts"] },
    { type: "feature", description: "用户认证系统", files: ["app/auth/page.tsx", "lib/auth.ts"] },
    { type: "improvement", description: "优化页面加载性能", files: [] },
  ],
  generatedAt: "2026-01-15T10:00:00Z",
  generatedBy: "system",
});

changelogStore.set("v2", {
  id: "cl-2",
  versionId: "v2",
  title: "v1.1.0 变更日志",
  content: "任务管理增强版本",
  changes: [
    { type: "feature", description: "新增任务筛选功能", files: ["components/TaskFilter.tsx"] },
    { type: "feature", description: "新增任务排序功能", files: ["components/TaskSort.tsx"] },
    { type: "fix", description: "修复任务详情页加载慢的问题", files: ["app/tasks/[id]/page.tsx"] },
  ],
  generatedAt: "2026-02-01T14:30:00Z",
  generatedBy: "system",
});

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/v1/versions/:id/changelog
 * 获取版本变更摘要
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const { id } = await params;
    const changelog = changelogStore.get(id);
    if (!changelog) {
      return jsonSuccess({ data: null, notice: `版本 ${id} 暂无变更摘要` }, requestId);
    }
    return jsonSuccess({ data: changelog }, requestId);
  } catch (err) {
    return jsonError(`获取变更摘要失败: ${err instanceof Error ? err.message : String(err)}`, 500, requestId);
  }
}

/**
 * PUT /api/v1/versions/:id/changelog
 * 保存手动编辑的变更摘要
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const { id } = await params;
    const body = await request.json() as { content?: string; title?: string; changes?: ChangelogChange[] };
    
    if (!body.content && !body.title && !body.changes) {
      return jsonError("请求体不能为空", 400, requestId);
    }

    const existing = changelogStore.get(id);
    const updated: VersionChangelog = existing ? {
      ...existing,
      title: body.title ?? existing.title,
      content: body.content ?? existing.content,
      changes: body.changes ?? existing.changes,
      generatedAt: new Date().toISOString(),
      generatedBy: "manual",
    } : {
      id: `cl-${Date.now()}`,
      versionId: id,
      title: body.title ?? "变更摘要",
      content: body.content ?? "",
      changes: body.changes ?? [],
      generatedAt: new Date().toISOString(),
      generatedBy: "manual",
    };

    changelogStore.set(id, updated);
    return jsonSuccess({ data: updated }, requestId);
  } catch (err) {
    return jsonError(`保存变更摘要失败: ${err instanceof Error ? err.message : String(err)}`, 500, requestId);
  }
}

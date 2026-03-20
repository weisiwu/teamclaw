import { NextRequest, NextResponse } from "next/server";

/** CORS headers for cross-origin API access */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400",
};

/** Generate a short unique request ID */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function jsonSuccess(data: unknown, requestId?: string): NextResponse {
  return NextResponse.json({ code: 0, data, requestId }, {
    headers: { ...corsHeaders },
  });
}

function jsonError(message: string, status: number, requestId?: string): NextResponse {
  return NextResponse.json(
    { code: status, message, requestId },
    { status }
  );
}

/** In-memory screenshot store — shared with the parent screenshots route via module-level singleton */
interface VersionMessageScreenshot {
  id: string;
  versionId: string;
  messageId: string;
  messageContent: string;
  senderName: string;
  senderAvatar?: string;
  screenshotUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
}

// NOTE: This is a separate in-memory store for this route.
// In production this would be a database. The store is keyed by versionId.
const screenshotStore = new Map<string, VersionMessageScreenshot[]>();

// Pre-populate so deletes can be tested
screenshotStore.set("v1", [
  {
    id: "ss-1",
    versionId: "v1",
    messageId: "msg-001",
    messageContent: "完成了任务管理模块的开发，新增筛选、排序功能",
    senderName: "张三",
    screenshotUrl: "https://internal.feishu.cn/avatar/placeholder.png",
    thumbnailUrl: "https://internal.feishu.cn/avatar/placeholder.png",
    createdAt: "2026-01-12T10:00:00Z",
  },
  {
    id: "ss-2",
    versionId: "v1",
    messageId: "msg-002",
    messageContent: "修复了登录页面的样式问题，优化了响应式布局",
    senderName: "李四",
    screenshotUrl: "https://internal.feishu.cn/avatar/placeholder.png",
    thumbnailUrl: "https://internal.feishu.cn/avatar/placeholder.png",
    createdAt: "2026-01-13T14:30:00Z",
  },
]);
screenshotStore.set("v2", [
  {
    id: "ss-3",
    versionId: "v2",
    messageId: "msg-003",
    messageContent: "新增 Cron 定时任务管理界面",
    senderName: "王五",
    screenshotUrl: "https://internal.feishu.cn/avatar/placeholder.png",
    thumbnailUrl: "https://internal.feishu.cn/avatar/placeholder.png",
    createdAt: "2026-02-15T09:00:00Z",
  },
]);

/**
 * DELETE /api/v1/versions/[id]/screenshots/[screenshotId]
 * 解绑截图
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; screenshotId: string }> }
) {
  const requestId = generateRequestId();
  const { id, screenshotId } = await params;

  if (!id || id.trim() === "") {
    return jsonError("版本 ID 不能为空", 400, requestId);
  }
  if (!screenshotId || screenshotId.trim() === "") {
    return jsonError("截图 ID 不能为空", 400, requestId);
  }

  const screenshots = screenshotStore.get(id) || [];
  const index = screenshots.findIndex((s) => s.id === screenshotId);

  if (index === -1) {
    return jsonError("截图不存在", 404, requestId);
  }

  const [removed] = screenshots.splice(index, 1);
  screenshotStore.set(id, screenshots);

  return jsonSuccess({ success: true, removedId: removed.id, versionId: id }, requestId);
}

/**
 * GET /api/v1/versions/[id]/screenshots/[screenshotId]
 * 获取单个截图详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; screenshotId: string }> }
) {
  const requestId = generateRequestId();
  const { id, screenshotId } = await params;

  if (!id || !screenshotId) {
    return jsonError("版本 ID 和截图 ID 都不能为空", 400, requestId);
  }

  const screenshots = screenshotStore.get(id) || [];
  const screenshot = screenshots.find((s) => s.id === screenshotId);

  if (!screenshot) {
    return jsonError("截图不存在", 404, requestId);
  }

  return jsonSuccess(screenshot, requestId);
}

/**
 * OPTIONS /api/v1/versions/[id]/screenshots/[screenshotId]
 * CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

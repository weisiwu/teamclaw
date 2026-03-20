import { NextRequest, NextResponse } from "next/server";

/** CORS headers for cross-origin API access */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

/** In-memory screenshot store (keyed by versionId) */
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

const screenshotStore = new Map<string, VersionMessageScreenshot[]>();

// Pre-populate with sample data
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
    messageContent: "新增 Cron 定时任务管理界面，支持配置多个定时任务",
    senderName: "王五",
    screenshotUrl: "https://internal.feishu.cn/avatar/placeholder.png",
    thumbnailUrl: "https://internal.feishu.cn/avatar/placeholder.png",
    createdAt: "2026-02-15T09:00:00Z",
  },
]);

/**
 * GET /api/v1/versions/[id]/screenshots
 * 获取版本关联的截图列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const { id } = await params;

  if (!id || id.trim() === "") {
    return jsonError("版本 ID 不能为空", 400, requestId);
  }

  const screenshots = screenshotStore.get(id) || [];

  return jsonSuccess(
    {
      data: screenshots,
      total: screenshots.length,
      versionId: id,
    },
    requestId
  );
}

/**
 * POST /api/v1/versions/[id]/screenshots
 * 关联截图到版本
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const { id } = await params;

  if (!id || id.trim() === "") {
    return jsonError("版本 ID 不能为空", 400, requestId);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("请求体必须是有效的 JSON", 400, requestId);
  }

  const { messageId, messageContent, senderName, senderAvatar, screenshotUrl, thumbnailUrl } = body;

  // Validate required fields
  if (!messageId || typeof messageId !== "string") {
    return jsonError("messageId 不能为空", 400, requestId);
  }
  if (!screenshotUrl || typeof screenshotUrl !== "string") {
    return jsonError("screenshotUrl 不能为空", 400, requestId);
  }
  // Validate URL format
  try {
    const url = new URL(screenshotUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      return jsonError("screenshotUrl 必须是有效的 HTTP/HTTPS URL", 400, requestId);
    }
  } catch {
    return jsonError("screenshotUrl 格式无效", 400, requestId);
  }

  const newScreenshot: VersionMessageScreenshot = {
    id: `ss-${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    versionId: id,
    messageId,
    messageContent: (messageContent as string) || "",
    senderName: (senderName as string) || "未知用户",
    senderAvatar: senderAvatar as string | undefined,
    screenshotUrl,
    thumbnailUrl: (thumbnailUrl as string) || screenshotUrl,
    createdAt: new Date().toISOString(),
  };

  const existing = screenshotStore.get(id) || [];
  existing.unshift(newScreenshot);
  screenshotStore.set(id, existing);

  return jsonSuccess(newScreenshot, requestId);
}

/**
 * OPTIONS /api/v1/versions/[id]/screenshots
 * CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

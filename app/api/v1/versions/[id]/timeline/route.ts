import { NextRequest, NextResponse } from "next/server";

/** CORS headers for cross-origin API access */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

/** In-memory timeline store (keyed by versionId) */
interface TimelineEventStore {
  id: string;
  type: "version_created" | "screenshot_linked" | "changelog_generated" | "manual_note";
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
  actorId?: string;
  screenshotId?: string;
  summaryId?: string;
  screenshot?: {
    id: string;
    url: string;
    thumbnailUrl?: string;
    messageContent?: string;
    senderName?: string;
  };
  changelog?: {
    features: string[];
    fixes: string[];
    improvements: string[];
    breaking: string[];
    docs: string[];
  };
}

const timelineStore = new Map<string, TimelineEventStore[]>();

// Pre-populate with sample data for demo versions
timelineStore.set("v1", [
  {
    id: "evt-1",
    type: "version_created",
    title: "版本创建",
    description: "版本 v1.0.0 已创建",
    timestamp: "2026-01-15T10:00:00Z",
    actor: "system",
  },
  {
    id: "evt-2",
    type: "screenshot_linked",
    title: "截图关联",
    description: "关联了飞书消息截图：讨论了 v1.0.0 的发布时间",
    timestamp: "2026-01-16T14:30:00Z",
    actor: "开发者",
    screenshotId: "sc-1",
    screenshot: {
      id: "sc-1",
      url: "https://internal.feishu.cn/avatar/placeholder.png",
      thumbnailUrl: "https://internal.feishu.cn/avatar/placeholder.png",
      messageContent: "讨论了 v1.0.0 的发布时间安排",
      senderName: "张三",
    },
  },
  {
    id: "evt-3",
    type: "changelog_generated",
    title: "变更摘要生成",
    description: "AI 生成了版本变更摘要",
    timestamp: "2026-01-17T09:00:00Z",
    actor: "AI",
    summaryId: "sum-1",
    changelog: {
      features: ["新增版本管理功能", "支持多环境构建"],
      fixes: ["修复了构建失败的问题"],
      improvements: ["优化了构建速度"],
      breaking: [],
      docs: ["更新了 README"],
    },
  },
]);

timelineStore.set("v2", [
  {
    id: "evt-v2-1",
    type: "version_created",
    title: "版本创建",
    description: "版本 v2.0.0 已创建",
    timestamp: "2026-02-01T10:00:00Z",
    actor: "system",
  },
]);

/**
 * GET /api/v1/versions/[id]/timeline
 * 获取版本变更时间线
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const { id } = await params;

  // Validate versionId
  if (!id || id.trim() === "") {
    return jsonError("版本 ID 不能为空", 400, requestId);
  }

  // Get events for this version (or empty array if not found)
  const events = timelineStore.get(id) || [];

  return jsonSuccess(
    {
      versionId: id,
      version: id,
      events,
    },
    requestId
  );
}

/**
 * OPTIONS /api/v1/versions/[id]/timeline
 * CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

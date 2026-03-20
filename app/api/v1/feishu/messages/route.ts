import { NextRequest, NextResponse } from "next/server";

const FEISHU_BASE_URL = "https://open.feishu.cn";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonSuccess(data: unknown) {
  return NextResponse.json({ code: 0, data }, { headers: corsHeaders });
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ code: status, message }, { status, headers: corsHeaders });
}

function getFeishuConfig(): { appId: string; appSecret: string } | null {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (appId && appSecret) return { appId, appSecret };
  return null;
}

async function getAppAccessToken(appId: string, appSecret: string): Promise<string> {
  const response = await fetch(`${FEISHU_BASE_URL}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  if (!response.ok) throw new Error(`Auth failed: ${response.status}`);
  const data = await response.json() as { code: number; tenant_access_token?: string; msg?: string };
  if (data.code !== 0) throw new Error(`Feishu auth error: ${data.code} ${data.msg}`);
  return data.tenant_access_token!;
}

/**
 * GET /api/v1/feishu/messages
 * 获取飞书消息列表
 */
export async function GET(request: NextRequest) {
  try {
    const config = getFeishuConfig();

    if (!config) {
      return jsonSuccess({
        messages: [],
        notice: "飞书 API 未配置，请设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET 环境变量",
        configured: false,
      });
    }

    const { searchParams } = new URL(request.url);
    const containerIdType = searchParams.get("container_id_type") ?? "chat";
    const containerId = searchParams.get("container_id");
    const pageSize = searchParams.get("page_size") ?? "20";
    const pageToken = searchParams.get("page_token");
    const sortType = searchParams.get("sort_type") ?? "ByCreateTimeDesc";

    if (!containerId) {
      return jsonError("缺少参数: container_id（群聊 ID）", 400);
    }

    const accessToken = await getAppAccessToken(config.appId, config.appSecret);

    const queryParams = new URLSearchParams();
    queryParams.set("container_id_type", containerIdType);
    queryParams.set("container_id", containerId);
    queryParams.set("page_size", pageSize);
    queryParams.set("sort_type", sortType);
    if (pageToken) queryParams.set("page_token", pageToken);

    const response = await fetch(
      `${FEISHU_BASE_URL}/open-apis/im/v1/messages?${queryParams.toString()}`,
      {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) throw new Error(`Feishu API error: ${response.status}`);

    const data = await response.json() as {
      code: number;
      msg?: string;
      data?: {
        items?: Array<{
          message_id: string;
          create_time: string;
          sender: { sender_type: string; sender_id: { open_id?: string; user_id?: string } };
          body: { content: string };
          chat_id?: string;
          chat_type?: string;
        }>;
        page_token?: string;
        has_more?: boolean;
      };
    };

    if (data.code !== 0) throw new Error(`Feishu API error: ${data.code} ${data.msg}`);

    const messages = (data.data?.items ?? []).map((msg) => {
      let content = msg.body.content;
      try {
        const parsed = JSON.parse(content);
        content = parsed.text || content;
      } catch {
        // plain text
      }
      const senderId = msg.sender.sender_id;
      const senderOpenId = senderId?.open_id || senderId?.user_id || "unknown";
      return {
        id: msg.message_id,
        content,
        senderName: senderOpenId,
        senderOpenId,
        timestamp: new Date(parseInt(msg.create_time, 10) * 1000).toISOString(),
        chatId: msg.chat_id,
        chatType: msg.chat_type,
      };
    });

    return jsonSuccess({
      messages,
      pageToken: data.data?.page_token,
      hasMore: data.data?.has_more ?? false,
      configured: true,
    });
  } catch (err) {
    console.error("[GET /api/v1/feishu/messages]", err);
    return jsonError(`获取飞书消息失败: ${err instanceof Error ? err.message : String(err)}`, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

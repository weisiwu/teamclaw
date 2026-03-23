import { NextRequest, NextResponse } from "next/server";
import {
  getFeishuConfig,
  getAppAccessToken,
  jsonSuccess,
  jsonError,
  requireAuth,
  optionsResponse,
  FEISHU_BASE_URL,
} from "@/lib/api/feishu";

export { optionsResponse as OPTIONS };

/**
 * GET /api/v1/feishu/chats
 * 获取Bot所在的群聊列表
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || `feishu_chat_${Date.now().toString(36)}`;

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const config = getFeishuConfig();

    if (!config) {
      return jsonSuccess({
        chats: [],
        notice: "飞书 API 未配置，请设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET 环境变量",
        configured: false,
      }, requestId);
    }

    const { searchParams } = new URL(request.url);
    const pageSize = searchParams.get("page_size") ?? "20";
    const pageToken = searchParams.get("page_token");

    const accessToken = await getAppAccessToken(config.appId, config.appSecret);

    const queryParams = new URLSearchParams();
    queryParams.set("page_size", pageSize);
    if (pageToken) queryParams.set("page_token", pageToken);

    const response = await fetch(
      `${FEISHU_BASE_URL}/open-apis/im/v1/chats?${queryParams.toString()}`,
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
          chat_id: string;
          name: string;
          description?: string;
          member_count?: number;
        }>;
        page_token?: string;
        has_more?: boolean;
      };
    };

    if (data.code !== 0) throw new Error(`Feishu API error: ${data.code} ${data.msg}`);

    return jsonSuccess({
      chats: (data.data?.items ?? []).map((chat) => ({
        chatId: chat.chat_id,
        name: chat.name,
        description: chat.description,
        memberCount: chat.member_count,
      })),
      pageToken: data.data?.page_token,
      hasMore: data.data?.has_more ?? false,
      configured: true,
    }, requestId);
  } catch (err) {
    console.error("[GET /api/v1/feishu/chats]", err);
    return jsonError(`获取群聊列表失败: ${err instanceof Error ? err.message : String(err)}`, 500, requestId);
  }
}

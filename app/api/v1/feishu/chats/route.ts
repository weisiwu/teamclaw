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
 * GET /api/v1/feishu/chats
 * 获取Bot所在的群聊列表
 */
export async function GET(request: NextRequest) {
  try {
    const config = getFeishuConfig();

    if (!config) {
      return jsonSuccess({
        chats: [],
        notice: "飞书 API 未配置，请设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET 环境变量",
        configured: false,
      });
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
    });
  } catch (err) {
    console.error("[GET /api/v1/feishu/chats]", err);
    return jsonError(`获取群聊列表失败: ${err instanceof Error ? err.message : String(err)}`, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

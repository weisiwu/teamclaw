/**
 * Shared Feishu API utilities — extracted to avoid duplication between
 * feishu/messages and feishu/chats route files.
 */

import {
  requireAuth,
  jsonSuccess,
  jsonError,
  corsHeaders,
  optionsResponse,
} from "@/lib/api-shared";

export const FEISHU_BASE_URL = "https://open.feishu.cn";

export interface FeishuConfig {
  appId: string;
  appSecret: string;
}

export function getFeishuConfig(): FeishuConfig | null {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (appId && appSecret) return { appId, appSecret };
  return null;
}

export async function getAppAccessToken(appId: string, appSecret: string): Promise<string> {
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

export { requireAuth, jsonSuccess, jsonError, corsHeaders, optionsResponse };

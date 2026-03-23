/**
 * Feishu Routes
 * 飞书开放平台 API 代理路由
 *
 * 端点：
 * GET  /api/v1/feishu/messages         - 获取飞书消息列表
 * GET  /api/v1/feishu/chats           - 获取群聊列表
 * GET  /api/v1/feishu/chats/:chatId/members - 获取群成员列表
 */

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import {
  getFeishuMessages,
  getFeishuChatMembers,
  FeishuService,
} from '../services/feishuService.js';
import { processMessage } from '../services/messagePipeline.js';

const router = Router();

// Feishu config - from environment variables or config
function getFeishuConfig(): { appId: string; appSecret: string } | null {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (appId && appSecret) {
    return { appId, appSecret };
  }
  return null;
}

// ============ GET /api/v1/feishu/messages ============
// 获取飞书消息列表（支持按群聊/会话筛选）
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const config = getFeishuConfig();

    // Return error if no Feishu config is available
    if (!config) {
      return res
        .status(503)
        .json(error(503, '飞书未配置，请在 .env 中设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET'));
    }

    const {
      container_id_type = 'chat',
      container_id,
      start_time,
      end_time,
      page_size = '20',
      page_token,
      sort_type = 'ByCreateTimeDesc',
    } = req.query as Record<string, string>;

    if (!container_id) {
      return res.status(400).json(error(400, '缺少参数: container_id（群聊 ID）'));
    }

    const result = await getFeishuMessages({
      appId: config.appId,
      appSecret: config.appSecret,
      containerIdType: container_id_type as 'chat' | 'thread' | 'p2p' | 'group',
      containerId: container_id,
      startTime: start_time,
      endTime: end_time,
      pageSize: parseInt(page_size, 10),
      pageToken: page_token,
      sortType: sort_type as 'ByCreateTimeAsc' | 'ByCreateTimeDesc',
    });

    // Parse message content and format response
    const messages = result.messages.map(msg => {
      const content = msg.body.content;
      let parsedContent = content;

      // Try to parse JSON content (Feishu message content is JSON string)
      try {
        const parsed = JSON.parse(content);
        parsedContent = parsed.text || content;
      } catch {
        // Already plain text
      }

      const senderId = msg.sender.senderId;
      const senderOpenId = senderId?.openId || senderId?.userId || 'unknown';

      return {
        id: msg.messageId,
        content: parsedContent,
        senderName: senderOpenId, // Will be enriched by frontend with user info
        senderOpenId,
        timestamp: new Date(parseInt(msg.createTime, 10) * 1000).toISOString(),
        chatId: msg.chatId,
        chatType: msg.chatType,
      };
    });

    res.json(
      success({
        messages,
        pageToken: result.pageToken,
        hasMore: result.hasMore,
        configured: true,
      })
    );
  } catch (err) {
    console.error('[GET /api/v1/feishu/messages] error:', err);
    res
      .status(500)
      .json(error(500, `获取飞书消息失败: ${err instanceof Error ? err.message : String(err)}`));
  }
});

// ============ GET /api/v1/feishu/chats ============
// 获取Bot所在的群聊列表
router.get('/chats', async (req: Request, res: Response) => {
  try {
    const config = getFeishuConfig();

    if (!config) {
      return res
        .status(503)
        .json(error(503, '飞书未配置，请在 .env 中设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET'));
    }

    const { page_size = '20', page_token } = req.query as Record<string, string>;

    const accessToken = await getAppAccessTokenSimple(config.appId, config.appSecret);

    const queryParams = new URLSearchParams();
    queryParams.set('page_size', page_size);
    if (page_token) {
      queryParams.set('page_token', page_token);
    }

    const response = await fetch(
      `https://open.feishu.cn/open-apis/im/v1/chats?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Feishu API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      code: number;
      msg: string;
      data?: {
        items?: Array<{
          chat_id: string;
          name: string;
          description?: string;
          member_count?: number;
        }>;
        page_token?: string;
        has_more: boolean;
      };
    };

    if (data.code !== 0) {
      throw new Error(`Feishu API error: ${data.code} ${data.msg}`);
    }

    res.json(
      success({
        chats: (data.data?.items || []).map(chat => ({
          chatId: chat.chat_id,
          name: chat.name,
          description: chat.description,
          memberCount: chat.member_count,
        })),
        pageToken: data.data?.page_token,
        hasMore: data.data?.has_more ?? false,
        configured: true,
      })
    );
  } catch (err) {
    console.error('[GET /api/v1/feishu/chats] error:', err);
    res
      .status(500)
      .json(error(500, `获取群聊列表失败: ${err instanceof Error ? err.message : String(err)}`));
  }
});

// ============ GET /api/v1/feishu/chats/:chatId/members ============
router.get('/chats/:chatId/members', async (req: Request, res: Response) => {
  try {
    const config = getFeishuConfig();

    if (!config) {
      return res
        .status(503)
        .json(error(503, '飞书未配置，请在 .env 中设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET'));
    }

    const { chatId } = req.params;
    const { page_size = '50', page_token } = req.query as Record<string, string>;

    const result = await getFeishuChatMembers({
      appId: config.appId,
      appSecret: config.appSecret,
      chatId,
      pageSize: parseInt(page_size, 10),
      pageToken: page_token,
    });

    res.json(
      success({
        members: result.members.map(m => ({
          memberId: m.memberId,
          name: m.name,
          avatarUrl: m.avatarUrl,
        })),
        pageToken: result.pageToken,
        hasMore: result.hasMore,
        configured: true,
      })
    );
  } catch (err) {
    console.error('[GET /api/v1/feishu/chats/:chatId/members] error:', err);
    res
      .status(500)
      .json(error(500, `获取群成员失败: ${err instanceof Error ? err.message : String(err)}`));
  }
});

// Helper: simple app access token fetch (duplicated from feishuService to avoid circular deps)
async function getAppAccessTokenSimple(appId: string, appSecret: string): Promise<string> {
  const response = await fetch(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get app access token: ${response.status}`);
  }

  const data = (await response.json()) as {
    code: number;
    msg: string;
    tenant_access_token?: string;
  };

  if (data.code !== 0) {
    throw new Error(`Feishu auth error: ${data.code} ${data.msg}`);
  }

  return data.tenant_access_token!;
}

// ============ POST /api/v1/feishu/webhook ============
// 飞书事件订阅回调（接收群聊消息）
router.post('/webhook', async (req: Request, res: Response) => {
  const config = getFeishuConfig();

  if (!config) {
    return res.status(503).json(error(503, '飞书未配置'));
  }

  const { timestamp, nonce, signature } = req.query as Record<string, string>;
  const bodyStr = JSON.stringify(req.body);

  // 验证签名
  const feishuService = new FeishuService({
    appId: config.appId,
    appSecret: config.appSecret,
    verificationToken: process.env.FEISHU_VERIFICATION_TOKEN,
    encryptKey: process.env.FEISHU_ENCRYPT_KEY,
  });

  if (process.env.FEISHU_ENCRYPT_KEY) {
    if (!feishuService.verifySignature(timestamp, nonce, bodyStr, signature)) {
      return res.status(403).json(error(403, '签名验证失败'));
    }
  }

  // 处理事件
  try {
    const unified = await feishuService.handleEvent(req.body);

    if (unified) {
      await processMessage({
        channel: 'feishu',
        userId: unified.userId,
        userName: unified.userName,
        role: 'employee',
        content: unified.content,
        mentionedAgent: unified.mentionedAgent,
        timestamp: unified.timestamp,
        rawPayload: req.body,
      });

      console.log(`[feishu webhook] Message queued: ${unified.messageId}`);
    }

    return res.json(success({ ret: 0 }));
  } catch (err) {
    console.error('[feishu webhook] Error:', err);
    return res
      .status(500)
      .json(error(500, `处理失败: ${err instanceof Error ? err.message : String(err)}`));
  }
});

export default router;

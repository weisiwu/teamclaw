/**
 * WeChat Service
 * 微信 Bot SDK 封装
 *
 * 提供微信消息的接收和发送接口
 * 基于 Wechaty 框架接入微信群聊
 */

import { Message } from '../models/message.js';

// Lazy-loaded Wechaty (optional dependency)
let WechatyBuilder: unknown = null;
function getWechatyBuilder() {
  if (!WechatyBuilder) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      WechatyBuilder = require('wechaty').WechatyBuilder;
    } catch {
      console.warn('[wechatService] Wechaty not installed, using webhook-only mode');
    }
  }
  return WechatyBuilder;
}

export interface WeChatMessage {
  msgId: string;
  fromUserName: string;
  toUserName: string;
  content: string;
  msgType: string;
  createTime: number;
  chatType?: 'group' | 'personal';
  roomId?: string;
}

export interface WeChatWebhookConfig {
  enabled: boolean;
  token?: string;
  encodingAesKey?: string;
  webhookUrl?: string;
}

export interface UnifiedMessage {
  messageId: string;
  channel: 'wechat' | 'feishu' | 'web';
  userId: string;
  userName: string;
  content: string;
  type: Message['type'];
  mentionedAgent?: string;
  groupId: string;
  timestamp: string;
  rawData?: unknown;
}

export function getWeChatConfig(): WeChatWebhookConfig {
  return {
    enabled: process.env.WECHAT_ENABLED === 'true',
    token: process.env.WECHAT_VERIFY_TOKEN,
    encodingAesKey: process.env.WECHAT_ENCODING_AES_KEY,
    webhookUrl: process.env.WECHAT_WEBHOOK_URL,
  };
}

export function parseWeChatMessage(payload: Record<string, unknown>): WeChatMessage | null {
  try {
    const msg: WeChatMessage = {
      msgId: String(payload.msgid ?? payload.MsgId ?? payload.MsgID ?? Date.now()),
      fromUserName: String(payload.fromusername ?? payload.FromUserName ?? ''),
      toUserName: String(payload.tousername ?? payload.ToUserName ?? ''),
      content: String(payload.content ?? payload.Content ?? ''),
      msgType: String(payload.msgtype ?? payload.MsgType ?? 'text').toLowerCase(),
      createTime: parseInt(String(payload.createtime ?? payload.CreateTime ?? Date.now()), 10),
      chatType: payload.roomid || payload.RoomId ? 'group' : 'personal',
      roomId: String(payload.roomid ?? payload.RoomId ?? ''),
    };
    return msg;
  } catch {
    return null;
  }
}

function verifyWeChatSignature(
  token: string,
  signature: string,
  timestamp: string,
  nonce: string
): boolean {
  const str = [token, timestamp, nonce].sort().join('');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto') as typeof import('crypto');
  const sha1 = crypto.createHash('sha1').update(str).digest('hex');
  return sha1 === signature;
}

async function sendWeChatMessage(params: {
  corpId: string;
  corpSecret: string;
  agentId: string;
  toUser: string;
  content: string;
  msgType?: 'text' | 'markdown';
}): Promise<{ errcode: number; errmsg: string }> {
  const { corpId, corpSecret, agentId, toUser, content, msgType = 'text' } = params;

  const tokenUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${corpSecret}`;
  const tokenRes = await fetch(tokenUrl);
  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    errcode?: number;
    errmsg?: string;
  };

  if (!tokenData.access_token) {
    throw new Error(`Failed to get WeChat access token: ${tokenData.errmsg ?? 'unknown error'}`);
  }

  const sendUrl = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${tokenData.access_token}`;
  const response = await fetch(sendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      touser: toUser,
      toparty: '',
      totag: '',
      msgtype: msgType,
      agentid: parseInt(agentId, 10),
      text: { content },
    }),
  });

  return response.json() as Promise<{ errcode: number; errmsg: string }>;
}

/**
 * WechatService Class
 * 基于 Wechaty 框架的微信群聊消息接收/发送
 */
export interface WechatyMessage {
  id: string;
  room: () => Promise<{ id: string } | null>;
  talker: () => Promise<{ id: string; name: () => string }>;
  text: () => Promise<string>;
  type: () => Promise<number>;
  toFileBox: () => Promise<{ name: string; toFile: (path: string) => Promise<void> }>;
  toImage: () => { toDataURL: () => Promise<string> };
}

export class WechatService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private bot: any = null;
  private initialized = false;

  /**
   * 初始化 Wechaty Bot
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    const Builder = getWechatyBuilder();
    if (!Builder) {
      console.log('[WechatService] Wechaty not available, running in webhook-only mode');
      return;
    }

    try {
      this.bot = Builder.build({
        puppet: process.env.WECHAT_PUPPET || 'wechaty-puppet-wechat',
        puppetOptions: {
          token: process.env.WECHAT_TOKEN,
        },
      });

      this.bot.on('message', async (msg: WechatyMessage) => {
        try {
          const unified = await this.onMessage(msg);
          if (unified) {
            console.log(`[WechatService] Message received: ${unified.content}`);
          }
        } catch (err) {
          console.error('[WechatService] Message handling error:', err);
        }
      });

      await this.bot.start();
      this.initialized = true;
      console.log('[WechatService] Wechaty bot started');
    } catch (err) {
      console.warn('[WechatService] Failed to start Wechaty, webhook-only mode:', err);
    }
  }

  /**
   * 接收群聊消息 → 转换为统一 Message 格式
   */
  async onMessage(raw: WechatyMessage): Promise<UnifiedMessage | null> {
    try {
      const room = raw.room();
      const text = await raw.text();
      const talker = raw.talker();
      const msgId = raw.id;

      if (!text || !talker) return null;

      // 忽略自身消息
      const selfId = this.bot?.currentUser?.id;
      if (selfId && (await talker).id === selfId) return null;

      // 检测 @Agent 提及
      const atResult = this.parseAtMention(text);
      const cleanContent = atResult?.cleanContent ?? text;

      const groupId = room ? (await room).id : 'personal';

      return {
        messageId: msgId,
        channel: 'wechat',
        userId: (await talker).id,
        userName: (await talker).name() || '微信用户',
        content: cleanContent,
        type: 'text',
        mentionedAgent: atResult?.agent,
        groupId,
        timestamp: new Date().toISOString(),
        rawData: raw,
      };
    } catch {
      return null;
    }
  }

  /**
   * 发送消息到群聊（Agent 回复）
   */
  async sendToGroup(groupId: string, content: string): Promise<void> {
    if (!this.bot) {
      // Fallback: 通过企业微信 API 发送
      const config = getWeChatConfig();
      if (
        config.enabled &&
        process.env.WECHAT_CORP_ID &&
        process.env.WECHAT_CORP_SECRET &&
        process.env.WECHAT_AGENT_ID
      ) {
        await sendWeChatMessage({
          corpId: process.env.WECHAT_CORP_ID,
          corpSecret: process.env.WECHAT_CORP_SECRET,
          agentId: process.env.WECHAT_AGENT_ID,
          toUser: groupId,
          content,
        });
      }
      return;
    }

    try {
      const room = this.bot.Room.find({ id: groupId });
      if (room) {
        await room.say(content);
      }
    } catch (err) {
      console.error('[WechatService] sendToGroup failed:', err);
    }
  }

  /**
   * 识别 @Agent 提及
   * 支持格式：@main、@pm、@coder、@reviewer
   */
  parseAtMention(content: string): { agent: string; cleanContent: string } | null {
    const agents = ['main', 'pm', 'coder', 'reviewer', 'devops'];
    const lowerContent = content.toLowerCase();
    for (const agent of agents) {
      const pattern = new RegExp(`@${agent}\\b`, 'i');
      if (pattern.test(lowerContent)) {
        const cleanContent = content.replace(pattern, '').trim();
        return { agent, cleanContent };
      }
    }
    return null;
  }

  /**
   * 处理文件消息
   */
  async handleFileMessage(raw: WechatyMessage): Promise<{
    messageId: string;
    type: Message['type'];
    url?: string;
    filename?: string;
  } | null> {
    try {
      const msgId = raw.id;
      const type = await raw.type();

      // 获取文件
      const file = await raw.toFileBox();
      const filename = file.name;

      // 图片消息
      if (type === 3 || type === 'Image') {
        const url = await raw.toImage().toDataURL();
        return { messageId: msgId, type: 'image', url, filename };
      }

      // 文件消息
      if (type === 49 || type === 'Attachment') {
        const localPath = `/tmp/wechat_files/${filename}`;
        await file.toFile(localPath);
        return { messageId: msgId, type: 'file', url: localPath, filename };
      }

      return null;
    } catch {
      return null;
    }
  }
}

export const wechatService = {
  getConfig: getWeChatConfig,
  parseMessage: parseWeChatMessage,
  verifySignature: verifyWeChatSignature,
  sendMessage: sendWeChatMessage,
};

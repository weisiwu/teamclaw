/**
 * WeChat Routes
 * 微信 webhook 路由
 *
 * 端点：
 * GET  /api/v1/wechat/verify   - 微信回调 URL 验证（GET）
 * POST /api/v1/wechat/webhook - 接收微信消息（POST）
 */

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { getWeChatConfig, parseWeChatMessage } from '../services/wechatService.js';
import { processMessage } from '../services/messagePipeline.js';

const router = Router();

/**
 * GET /api/v1/wechat/verify
 * 微信回调 URL 验证（首次配置时微信服务器会发送 GET 请求）
 * 验证逻辑：echo echostr 参数
 */
router.get('/verify', (req: Request, res: Response) => {
  const config = getWeChatConfig();

  if (!config.enabled) {
    return res.status(503).json(error(503, '微信未启用'));
  }

  const { signature, timestamp, nonce, echostr } = req.query as Record<string, string>;

  if (!signature || !timestamp || !nonce) {
    return res.status(400).json(error(400, '缺少验证参数'));
  }

  // 验证签名
  if (config.token) {
    const crypto = require('crypto') as typeof import('crypto');
    const str = [config.token, timestamp, nonce].sort().join('');
    const sha1 = crypto.createHash('sha1').update(str).digest('hex');
    if (sha1 !== signature) {
      return res.status(403).json(error(403, '签名验证失败'));
    }
  }

  // 如果有 echostr，原样返回用于验证
  if (echostr) {
    return res.send(echostr);
  }

  return res.send('ok');
});

/**
 * POST /api/v1/wechat/webhook
 * 接收微信消息并推入消息队列
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const config = getWeChatConfig();

  if (!config.enabled) {
    return res.status(503).json(error(503, '微信未启用'));
  }

  const { signature, timestamp, nonce, msg_signature } = req.query as Record<string, string>;

  // 验证签名（如果配置了 token）
  if (config.token && signature) {
    const crypto = require('crypto') as typeof import('crypto');
    const str = [config.token, timestamp, nonce].sort().join('');
    const sha1 = crypto.createHash('sha1').update(str).digest('hex');
    if (sha1 !== signature) {
      console.warn('[wechat webhook] Signature verification failed');
      return res.status(403).json(error(403, '签名验证失败'));
    }
  }

  const payload = req.body as Record<string, unknown>;

  // 解析消息
  const msg = parseWeChatMessage(payload);
  if (!msg) {
    return res.status(400).json(error(400, '无法解析消息'));
  }

  // 忽略非文本消息（暂时只处理文本）
  if (msg.msgType !== 'text') {
    console.log(`[wechat webhook] Ignored ${msg.msgType} message from ${msg.fromUserName}`);
    return res.json(success({ ret: 0 }));
  }

  // 构建内部消息格式并推入队列
  try {
    const result = await processMessage({
      channel: 'wechat',
      userId: msg.fromUserName,
      userName: msg.fromUserName,
      content: msg.content,
      rawPayload: payload,
    });

    console.log(`[wechat webhook] Message queued: ${result.messageId}`);
    return res.json(success({ ret: 0, messageId: result.messageId }));
  } catch (err) {
    console.error('[wechat webhook] Failed to process message:', err);
    return res.status(500).json(error(500, `处理消息失败: ${err instanceof Error ? err.message : String(err)}`));
  }
});

export default router;

/**
 * Message Routes
 * 消息机制模块 - REST API 路由
 *
 * 端点：
 * POST     /api/v1/messages                          - 接收外部消息
 * GET      /api/v1/messages/queue                   - 获取当前消息队列
 * GET      /api/v1/messages/queue/:queueId          - 获取队列详情
 * POST     /api/v1/messages/queue/:messageId/preempt - 手动触发抢占
 * GET      /api/v1/messages/history                 - 获取消息历史
 * POST     /api/v1/messages/file                     - 上传文件消息
 * PATCH    /api/v1/messages/:messageId/status       - 更新消息状态
 * GET      /api/v1/messages/stats                    - 消息统计
 * GET      /api/v1/messages/dlq                      - DLQ 列表
 * GET      /api/v1/messages/dlq/stats                - DLQ 统计
 * GET      /api/v1/messages/dlq/:messageId           - DLQ 单条消息
 * POST     /api/v1/messages/dlq/:messageId/requeue   - 从 DLQ 重新入队
 * DELETE   /api/v1/messages/dlq/:messageId           - 从 DLQ 丢弃消息
 * GET      /api/v1/messages/retry/stats              - 重试服务统计
 * GET      /api/v1/messages/retry/:messageId        - 消息重试状态
 * GET      /api/v1/messages/ratelimit/stats          - 限流统计（新增）
 * GET      /api/v1/messages/ratelimit/check         - 限流检查（新增）
 * PUT      /api/v1/messages/ratelimit/config        - 更新限流配置（新增）
 * GET      /api/v1/messages/circuit/stats           - 断路器统计（新增）
 * POST     /api/v1/messages/circuit/:channel/reset - 重置断路器（新增）
 * GET      /api/v1/messages/unified/inbox           - 统一收件箱（新增）
 * GET      /api/v1/messages/unified/sessions        - 跨渠道会话列表（新增）
 * GET      /api/v1/messages/unified/sessions/:userGlobalId - 会话详情（新增）
 * POST     /api/v1/messages/unified/read            - 标记已读（新增）
 * GET      /api/v1/messages/router/rules            - 路由规则列表（新增）
 * POST     /api/v1/messages/router/rules            - 添加路由规则（新增）
 * PUT      /api/v1/messages/router/rules/:ruleId    - 更新路由规则（新增）
 * DELETE   /api/v1/messages/router/rules/:ruleId    - 删除路由规则（新增）
 * POST     /api/v1/messages/router/route            - 手动路由测试（新增）
 * GET      /api/v1/messages/router/stats            - 路由统计（新增）
 */

import { Router } from 'express';
import { success, error } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { messageQueueService } from '../services/messageQueue.js';
import { enrichMessagePriority } from '../services/priorityCalculator.js';
import { manualPreempt, buildPreemptionNotification } from '../services/preemptionService.js';
import { messageStatsService } from '../services/messageStats.js';
import { messageDLQService } from '../services/messageDLQ.js';
import { messageRetryService } from '../services/messageRetry.js';
import { messageRateLimiterService } from '../services/messageRateLimiter.js';
import { messageCircuitBreakerService } from '../services/messageCircuitBreaker.js';
import { messageChannelAggregatorService } from '../services/messageChannelAggregator.js';
import { messageRouterService } from '../services/messageRouter.js';
import { processMessage } from '../services/messagePipeline.js';
import { docService } from '../services/docService.js';
import { parseDocument } from '../services/docParser.js';
import { addDocuments } from '../services/vectorStore.js';
import {
  Message,
  ReceiveMessageRequest,
  MessageHistoryQuery,
} from '../models/message.js';

const router = Router();

// ============================================
// 文件文档库写入 + 解析 + 向量化（异步辅助函数）
// ============================================
const PARSEABLE_MIMES = new Set([
  'text/markdown', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

async function saveFileToDocLibrary(
  messageId: string,
  fileData: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    content?: string;
    channel: Message['channel'];
    userId: string;
    userName: string;
  }
): Promise<void> {
  try {
    // 写入文档库
    let docId = `file_${messageId}`;
    if (fileData.content) {
      const buffer = Buffer.from(fileData.content, fileData.content.startsWith('JVBER') ? 'base64' : 'utf8');
      const doc = docService.uploadDoc(fileData.fileName, buffer);
      docId = doc.id;
      console.log(`[messages] File saved to doc library: ${doc.id} (${fileData.fileName})`);
    } else {
      // 无内容时只记录引用
      console.log(`[messages] File without content recorded: ${fileData.fileName} (messageId: ${messageId})`);
    }

    // 可解析类型 → 解析内容 → 向量化
    if (PARSEABLE_MIMES.has(fileData.mimeType) && fileData.content) {
      try {
        // 将内容写入临时文件供解析器使用
        const tmpPath = `/tmp/teamclaw/tmp_${messageId}_${fileData.fileName}`;
        const fs = await import('fs');
        const path = await import('path');
        await fs.promises.mkdir(path.dirname(tmpPath), { recursive: true });
        const contentBuffer = Buffer.from(fileData.content, fileData.content.startsWith('JVBER') ? 'base64' : 'utf8');
        await fs.promises.writeFile(tmpPath, contentBuffer);

        const parsed = await parseDocument(tmpPath);
        if (parsed && parsed.content) {
          // 向量化存储解析结果
          await addDocuments(
            'documents',
            [parsed.content],
            [`doc_${docId}`],
            [{
              docId,
              fileName: fileData.fileName,
              mimeType: fileData.mimeType,
              messageId,
              channel: fileData.channel,
              uploadedAt: new Date().toISOString(),
              type: 'document_content',
            }]
          );
          console.log(`[messages] Document content parsed and vectorized: ${fileData.fileName}`);
        }

        // 清理临时文件
        await fs.promises.unlink(tmpPath).catch(() => {});
      } catch (parseErr) {
        console.warn(`[messages] Failed to parse/file document ${fileData.fileName}:`, parseErr);
      }
    }
  } catch (err) {
    console.error('[messages] saveFileToDocLibrary error:', err);
  }
}

// ============================================
// POST /api/v1/messages - 接收外部消息
// ============================================
router.post('/', async (req, res) => {
  try {
    const body = req.body as ReceiveMessageRequest;

    if (!body.content || !body.channel || !body.userId) {
      return res.status(400).json(error(400, '缺少必要字段: content, channel, userId'));
    }

    // 使用 messagePipeline 处理完整流程：入队→@检测→权限→任务→Agent→回复
    const pipelineResult = await processMessage(body);

    // 统计
    const msg = messageQueueService.getMessage(pipelineResult.messageId);
    if (msg) {
      messageStatsService.onEnqueued(msg);
    }

    res.status(201).json(success({
      messageId: pipelineResult.messageId,
      taskId: pipelineResult.taskId,
      executionId: pipelineResult.executionId,
      acknowledged: pipelineResult.acknowledged,
      success: pipelineResult.success,
      error: pipelineResult.error,
    }));
  } catch (err) {
    console.error('[messages] POST / error:', err);
    res.status(500).json(error(500, '消息接收失败'));
  }
});

// ============================================
// GET /api/v1/messages/queue - 获取当前消息队列
// ============================================
router.get('/queue', (req, res) => {
  try {
    const status = messageQueueService.getQueueStatus();
    res.json(success(status));
  } catch (err) {
    console.error('[messages] GET /queue error:', err);
    res.status(500).json(error(500, '获取队列状态失败'));
  }
});

// ============================================
// GET /api/v1/messages/queue/:queueId - 获取队列详情
// ============================================
router.get('/queue/:queueId', (req, res) => {
  try {
    const { queueId } = req.params;
    const details = messageQueueService.getQueueDetails(queueId);
    res.json(success(details));
  } catch (err) {
    console.error('[messages] GET /queue/:queueId error:', err);
    res.status(500).json(error(500, '获取队列详情失败'));
  }
});

// ============================================
// POST /api/v1/messages/queue/:messageId/preempt - 手动触发抢占
// ============================================
router.post('/queue/:messageId/preempt', (req, res) => {
  try {
    const { messageId } = req.params;
    const result = manualPreempt(messageId);
    if (!result.success) {
      return res.status(400).json(error(400, result.error || '抢占失败'));
    }
    res.json(success({
      preemptedMessageId: result.preemptedId,
      currentProcessing: messageQueueService.getQueueStatus().currentProcessing,
    }));
  } catch (err) {
    console.error('[messages] POST /queue/:messageId/preempt error:', err);
    res.status(500).json(error(500, '抢占操作失败'));
  }
});

// ============================================
// GET /api/v1/messages/history - 获取消息历史
// ============================================
router.get('/history', (req, res) => {
  try {
    const params: MessageHistoryQuery = {
      page: req.query.page ? parseInt(String(req.query.page)) : 1,
      pageSize: req.query.pageSize ? parseInt(String(req.query.pageSize)) : 20,
      userId: req.query.userId ? String(req.query.userId) : undefined,
      startTime: req.query.startTime ? String(req.query.startTime) : undefined,
      endTime: req.query.endTime ? String(req.query.endTime) : undefined,
      channel: req.query.channel ? (String(req.query.channel) as Message['channel']) : undefined,
    };
    const result = messageQueueService.getMessageHistory(params);
    res.json(success(result));
  } catch (err) {
    console.error('[messages] GET /history error:', err);
    res.status(500).json(error(500, '获取消息历史失败'));
  }
});

// ============================================
// POST /api/v1/messages/file - 上传文件消息
// ============================================
router.post('/file', (req, res) => {
  try {
    const body = req.body as {
      channel: Message['channel'];
      userId: string;
      userName: string;
      role: Message['role'];
      fileName: string;
      fileSize: number;
      mimeType: string;
      content?: string;
    };

    if (!body.fileName || !body.mimeType) {
      return res.status(400).json(error(400, '缺少必要字段: fileName, mimeType'));
    }

    const supportedTypes = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/markdown', 'text/plain',
    ];

    if (!supportedTypes.includes(body.mimeType)) {
      return res.status(400).json(error(400, `不支持的文件类型: ${body.mimeType}`));
    }

    const content = body.content || `[文件] ${body.fileName}`;
    const { urgency, priority, roleWeight } = enrichMessagePriority(body.role || 'employee', content);

    const result = messageQueueService.enqueue({
      channel: body.channel,
      userId: body.userId,
      userName: body.userName || '未知用户',
      role: body.role || 'employee',
      roleWeight,
      content,
      type: 'file',
      urgency,
      priority,
      timestamp: new Date().toISOString(),
      fileInfo: {
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        convertedContent: body.content,
      },
    });

    // 异步：写入文档库 + 解析 + 向量化（非阻塞，不影响响应）
    saveFileToDocLibrary(result.message.messageId, body).catch(err => {
      console.error('[messages] POST /file: doc library save failed:', err.message);
    });

    res.status(201).json(success({
      messageId: result.message.messageId,
      status: result.message.status,
    }));
  } catch (err) {
    console.error('[messages] POST /file error:', err);
    res.status(500).json(error(500, '文件消息处理失败'));
  }
});

// ============================================
// PATCH /api/v1/messages/:messageId/status - 更新消息状态
// ============================================
router.patch('/:messageId/status', (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body as { status: Message['status'] };

    if (!status) {
      return res.status(400).json(error(400, '缺少 status 字段'));
    }

    const validStatuses: Message['status'][] = ['pending', 'processing', 'completed', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(error(400, `无效的 status 值: ${status}`));
    }

    const updated = messageQueueService.updateMessageStatus(messageId, status);
    if (!updated) {
      return res.status(404).json(error(404, '消息不存在'));
    }

    if (status === 'completed') {
      const msg = messageQueueService.getMessage(messageId);
      if (msg) messageStatsService.onCompleted(msg);
    }

    res.json(success({ messageId, status }));
  } catch (err) {
    console.error('[messages] PATCH /:messageId/status error:', err);
    res.status(500).json(error(500, '状态更新失败'));
  }
});

// ============================================
// GET /api/v1/messages/stats - 消息统计
// ============================================
router.get('/stats', (req, res) => {
  try {
    const queueStatus = messageQueueService.getQueueStatus();
    const stats = messageStatsService.getStats(queueStatus.total, queueStatus.currentProcessing);
    res.json(success(stats));
  } catch (err) {
    console.error('[messages] GET /stats error:', err);
    res.status(500).json(error(500, '获取消息统计失败'));
  }
});

// ============================================
// GET /api/v1/messages/dlq - DLQ 列表
// ============================================
router.get('/dlq', (req, res) => {
  try {
    const params = {
      page: req.query.page ? parseInt(String(req.query.page)) : 1,
      pageSize: req.query.pageSize ? parseInt(String(req.query.pageSize)) : 20,
      channel: req.query.channel ? String(req.query.channel) as Message['channel'] : undefined,
    };
    const result = messageDLQService.getDLQEntries(params);
    res.json(success(result));
  } catch (err) {
    console.error('[messages] GET /dlq error:', err);
    res.status(500).json(error(500, '获取 DLQ 失败'));
  }
});

// ============================================
// GET /api/v1/messages/dlq/stats - DLQ 统计
// ============================================
router.get('/dlq/stats', (req, res) => {
  try {
    const stats = messageDLQService.getStats();
    res.json(success(stats));
  } catch (err) {
    console.error('[messages] GET /dlq/stats error:', err);
    res.status(500).json(error(500, '获取 DLQ 统计失败'));
  }
});

// ============================================
// GET /api/v1/messages/dlq/:messageId - DLQ 单条消息
// ============================================
router.get('/dlq/:messageId', (req, res) => {
  try {
    const { messageId } = req.params;
    const entry = messageDLQService.getEntry(messageId);
    if (!entry) {
      return res.status(404).json(error(404, 'DLQ 中不存在该消息'));
    }
    res.json(success(entry));
  } catch (err) {
    console.error('[messages] GET /dlq/:messageId error:', err);
    res.status(500).json(error(500, '获取 DLQ 消息详情失败'));
  }
});

// ============================================
// POST /api/v1/messages/dlq/:messageId/requeue - 从 DLQ 重新入队
// ============================================
router.post('/dlq/:messageId/requeue', requireAuth, (req, res) => {
  try {
    const { messageId } = req.params;
    const msg = messageDLQService.requeue(messageId);
    if (!msg) {
      return res.status(404).json(error(404, 'DLQ 中不存在该消息'));
    }
    const result = messageQueueService.enqueue({
      channel: msg.channel,
      userId: msg.userId,
      userName: msg.userName,
      role: msg.role,
      roleWeight: msg.roleWeight,
      content: msg.content,
      type: msg.type,
      urgency: msg.urgency,
      timestamp: new Date().toISOString(),
      fileInfo: msg.fileInfo,
    });
    messageStatsService.onEnqueued(result.message);
    res.json(success({
      messageId: result.message.messageId,
      status: result.message.status,
      requeued: true,
    }));
  } catch (err) {
    console.error('[messages] POST /dlq/:messageId/requeue error:', err);
    res.status(500).json(error(500, 'DLQ 重新入队失败'));
  }
});

// ============================================
// DELETE /api/v1/messages/dlq/:messageId - 从 DLQ 丢弃消息
// ============================================
router.delete('/dlq/:messageId', requireAuth, (req, res) => {
  try {
    const { messageId } = req.params;
    const discarded = messageDLQService.discard(messageId);
    res.json(success({ discarded }));
  } catch (err) {
    console.error('[messages] DELETE /dlq/:messageId error:', err);
    res.status(500).json(error(500, 'DLQ 丢弃失败'));
  }
});

// ============================================
// GET /api/v1/messages/retry/stats - 重试服务统计
// ============================================
router.get('/retry/stats', (req, res) => {
  try {
    const stats = messageRetryService.getStats();
    res.json(success(stats));
  } catch (err) {
    console.error('[messages] GET /retry/stats error:', err);
    res.status(500).json(error(500, '获取重试统计失败'));
  }
});

// ============================================
// GET /api/v1/messages/retry/:messageId - 消息重试状态
// ============================================
router.get('/retry/:messageId', (req, res) => {
  try {
    const { messageId } = req.params;
    const status = messageRetryService.getRetryStatus(messageId);
    res.json(success({ messageId, retryStatus: status }));
  } catch (err) {
    console.error('[messages] GET /retry/:messageId error:', err);
    res.status(500).json(error(500, '获取重试状态失败'));
  }
});

// ============================================
// GET /api/v1/messages/ratelimit/stats - 限流统计
// ============================================
router.get('/ratelimit/stats', (req, res) => {
  try {
    const queueStatus = messageQueueService.getQueueStatus();
    const stats = messageRateLimiterService.getStats(queueStatus.total);
    res.json(success(stats));
  } catch (err) {
    console.error('[messages] GET /ratelimit/stats error:', err);
    res.status(500).json(error(500, '获取限流统计失败'));
  }
});

// ============================================
// GET /api/v1/messages/ratelimit/check - 限流检查
// ============================================
router.get('/ratelimit/check', (req, res) => {
  try {
    const { userId, role, channel } = req.query;
    if (!userId || !role || !channel) {
      return res.status(400).json(error(400, '缺少参数: userId, role, channel'));
    }
    const queueStatus = messageQueueService.getQueueStatus();
    const result = messageRateLimiterService.check(
      String(userId), String(role), String(channel), queueStatus.total
    );
    res.json(success(result));
  } catch (err) {
    console.error('[messages] GET /ratelimit/check error:', err);
    res.status(500).json(error(500, '限流检查失败'));
  }
});

// ============================================
// PUT /api/v1/messages/ratelimit/config - 更新限流配置
// ============================================
router.put('/ratelimit/config', requireAuth, (req, res) => {
  try {
    const { key, maxMessages, windowMs } = req.body;
    if (!key) return res.status(400).json(error(400, '缺少 key 参数'));
    messageRateLimiterService.updateConfig(key, { maxMessages, windowMs });
    res.json(success({ key, updated: true }));
  } catch (err) {
    console.error('[messages] PUT /ratelimit/config error:', err);
    res.status(500).json(error(500, '更新限流配置失败'));
  }
});

// ============================================
// GET /api/v1/messages/circuit/stats - 断路器统计
// ============================================
router.get('/circuit/stats', (req, res) => {
  try {
    const { channel } = req.query;
    const stats = messageCircuitBreakerService.getStats(channel ? String(channel) : undefined);
    res.json(success(stats));
  } catch (err) {
    console.error('[messages] GET /circuit/stats error:', err);
    res.status(500).json(error(500, '获取断路器统计失败'));
  }
});

// ============================================
// POST /api/v1/messages/circuit/:channel/reset - 重置断路器（需要身份认证）
// ============================================
router.post('/circuit/:channel/reset', requireAuth, (req, res) => {
  try {
    const { channel } = req.params;
    messageCircuitBreakerService.reset(channel);
    res.json(success({ channel, reset: true }));
  } catch (err) {
    console.error('[messages] POST /circuit/:channel/reset error:', err);
    res.status(500).json(error(500, '重置断路器失败'));
  }
});

// ============================================
// GET /api/v1/messages/unified/inbox - 统一收件箱
// ============================================
router.get('/unified/inbox', (req, res) => {
  try {
    const params = {
      page: req.query.page ? parseInt(String(req.query.page)) : 1,
      pageSize: req.query.pageSize ? parseInt(String(req.query.pageSize)) : 20,
      channel: req.query.channel ? String(req.query.channel) as Message['channel'] : undefined,
      role: req.query.role ? String(req.query.role) as Message['role'] : undefined,
      unreadOnly: req.query.unreadOnly === 'true',
    };
    const result = messageChannelAggregatorService.getUnifiedInbox(params);
    res.json(success(result));
  } catch (err) {
    console.error('[messages] GET /unified/inbox error:', err);
    res.status(500).json(error(500, '获取统一收件箱失败'));
  }
});

// ============================================
// GET /api/v1/messages/unified/sessions - 跨渠道会话列表
// ============================================
router.get('/unified/sessions', (req, res) => {
  try {
    const params = {
      page: req.query.page ? parseInt(String(req.query.page)) : 1,
      pageSize: req.query.pageSize ? parseInt(String(req.query.pageSize)) : 20,
      hasUnread: req.query.hasUnread === 'true' ? true : req.query.hasUnread === 'false' ? false : undefined,
    };
    const result = messageChannelAggregatorService.getUserSessions(params);
    res.json(success(result));
  } catch (err) {
    console.error('[messages] GET /unified/sessions error:', err);
    res.status(500).json(error(500, '获取跨渠道会话列表失败'));
  }
});

// ============================================
// GET /api/v1/messages/unified/sessions/:userGlobalId - 跨渠道会话详情
// ============================================
router.get('/unified/sessions/:userGlobalId', (req, res) => {
  try {
    const { userGlobalId } = req.params;
    const messages = messageChannelAggregatorService.getSessionMessages(userGlobalId);
    res.json(success({ userGlobalId, messages, total: messages.length }));
  } catch (err) {
    console.error('[messages] GET /unified/sessions/:userGlobalId error:', err);
    res.status(500).json(error(500, '获取会话详情失败'));
  }
});

// ============================================
// POST /api/v1/messages/unified/read - 标记已读
// ============================================
router.post('/unified/read', requireAuth, (req, res) => {
  try {
    const { globalId, userGlobalId } = req.body;
    let marked = 0;
    if (globalId) {
      marked += messageChannelAggregatorService.markRead(globalId) ? 1 : 0;
    }
    if (userGlobalId) {
      marked += messageChannelAggregatorService.markAllRead(userGlobalId);
    }
    res.json(success({ marked }));
  } catch (err) {
    console.error('[messages] POST /unified/read error:', err);
    res.status(500).json(error(500, '标记已读失败'));
  }
});

// ============================================
// GET /api/v1/messages/router/rules - 路由规则列表
// ============================================
router.get('/router/rules', (req, res) => {
  try {
    const rules = messageRouterService.getRules();
    res.json(success({ rules, total: rules.length }));
  } catch (err) {
    console.error('[messages] GET /router/rules error:', err);
    res.status(500).json(error(500, '获取路由规则失败'));
  }
});

// ============================================
// POST /api/v1/messages/router/rules - 添加路由规则（需要身份认证）
// ============================================
router.post('/router/rules', requireAuth, (req, res) => {
  try {
    const rule = req.body;
    if (!rule.id || !rule.name) {
      return res.status(400).json(error(400, '缺少必要字段: id, name'));
    }
    messageRouterService.upsertRule(rule);
    res.status(201).json(success({ ruleId: rule.id, added: true }));
  } catch (err) {
    console.error('[messages] POST /router/rules error:', err);
    res.status(500).json(error(500, '添加路由规则失败'));
  }
});

// ============================================
// PUT /api/v1/messages/router/rules/:ruleId - 更新路由规则（需要身份认证）
// ============================================
router.put('/router/rules/:ruleId', requireAuth, (req, res) => {
  try {
    const { ruleId } = req.params;
    const rule = req.body;
    rule.id = ruleId;
    messageRouterService.upsertRule(rule);
    res.json(success({ ruleId, updated: true }));
  } catch (err) {
    console.error('[messages] PUT /router/rules/:ruleId error:', err);
    res.status(500).json(error(500, '更新路由规则失败'));
  }
});

// ============================================
// DELETE /api/v1/messages/router/rules/:ruleId - 删除路由规则（需要身份认证）
// ============================================
router.delete('/router/rules/:ruleId', requireAuth, (req, res) => {
  try {
    const { ruleId } = req.params;
    const deleted = messageRouterService.deleteRule(ruleId);
    res.json(success({ ruleId, deleted }));
  } catch (err) {
    console.error('[messages] DELETE /router/rules/:ruleId error:', err);
    res.status(500).json(error(500, '删除路由规则失败'));
  }
});

// ============================================
// POST /api/v1/messages/router/route - 手动路由测试
// ============================================
router.post('/router/route', (req, res) => {
  try {
    const { channel, userId, role, content, priority } = req.body;
    if (!channel || !userId || !role || !content) {
      return res.status(400).json(error(400, '缺少必要字段'));
    }
    const result = messageRouterService.route({ channel, userId, role, content, priority: priority || 1 });
    res.json(success(result));
  } catch (err) {
    console.error('[messages] POST /router/route error:', err);
    res.status(500).json(error(500, '路由测试失败'));
  }
});

// ============================================
// GET /api/v1/messages/router/stats - 路由统计
// ============================================
router.get('/router/stats', (req, res) => {
  try {
    const stats = messageRouterService.getRouteStats();
    res.json(success(stats));
  } catch (err) {
    console.error('[messages] GET /router/stats error:', err);
    res.status(500).json(error(500, '获取路由统计失败'));
  }
});

export default router;

/**
 * Message Routes
 * 消息机制模块 - REST API 路由
 *
 * 端点：
 * POST   /api/v1/messages                        - 接收外部消息
 * GET    /api/v1/messages/queue                 - 获取当前消息队列
 * GET    /api/v1/messages/queue/:queueId        - 获取队列详情
 * POST   /api/v1/messages/queue/:messageId/preempt - 手动触发抢占
 * GET    /api/v1/messages/history               - 获取消息历史
 * POST   /api/v1/messages/file                 - 上传文件消息
 * PATCH  /api/v1/messages/:messageId/status    - 更新消息状态
 * GET    /api/v1/messages/stats                - 消息统计（新增）
 * GET    /api/v1/messages/dlq                  - DLQ 列表（新增）
 * GET    /api/v1/messages/dlq/stats             - DLQ 统计（新增）
 * GET    /api/v1/messages/dlq/:messageId        - DLQ 单条消息（新增）
 * POST   /api/v1/messages/dlq/:messageId/requeue - 从 DLQ 重新入队（新增）
 * DELETE /api/v1/messages/dlq/:messageId        - 从 DLQ 丢弃消息（新增）
 * GET    /api/v1/messages/retry/stats           - 重试服务统计（新增）
 * GET    /api/v1/messages/retry/:messageId      - 消息重试状态（新增）
 */

import { Router } from 'express';
import { success, error } from '../utils/response.js';
import { messageQueueService } from '../services/messageQueue.js';
import { enrichMessagePriority } from '../services/priorityCalculator.js';
import { manualPreempt, buildPreemptionNotification } from '../services/preemptionService.js';
import { messageStatsService } from '../services/messageStats.js';
import { messageDLQService } from '../services/messageDLQ.js';
import { messageRetryService } from '../services/messageRetry.js';
import {
  Message,
  ReceiveMessageRequest,
  MessageHistoryQuery,
} from '../models/message.js';

const router = Router();

// ============================================
// POST /api/v1/messages - 接收外部消息
// ============================================
router.post('/', async (req, res) => {
  try {
    const body = req.body as ReceiveMessageRequest;

    if (!body.content || !body.channel || !body.userId) {
      return res.status(400).json(error(400, '缺少必要字段: content, channel, userId'));
    }

    const role = body.role || 'employee';
    const { urgency, priority, roleWeight } = enrichMessagePriority(role, body.content);

    const messageData = {
      channel: body.channel,
      userId: body.userId,
      userName: body.userName || '未知用户',
      role,
      roleWeight,
      content: body.content,
      type: body.type || 'text',
      urgency,
      priority,
      timestamp: body.timestamp || new Date().toISOString(),
      fileInfo: body.fileInfo,
    };

    const result = messageQueueService.enqueue(messageData);

    // 统计
    messageStatsService.onEnqueued(result.message);
    if (result.preempted) messageStatsService.onPreempted();
    if (result.message.mergedFrom?.length) messageStatsService.onMerged();

    let notification: string | null = null;
    if (result.preempted && result.preemptedMessageId) {
      const preemptedMsg = messageQueueService.getMessage(result.preemptedMessageId);
      if (preemptedMsg) {
        notification = buildPreemptionNotification(
          preemptedMsg.userName, preemptedMsg.content.slice(0, 20),
          result.message.userName, result.message.content.slice(0, 20)
        );
      }
    }

    res.status(201).json(success({
      messageId: result.message.messageId,
      priority: result.message.priority,
      status: result.message.status,
      preempted: result.preempted,
      notification,
      merged: !!result.message.mergedFrom?.length,
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
router.post('/dlq/:messageId/requeue', (req, res) => {
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
router.delete('/dlq/:messageId', (req, res) => {
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

export default router;

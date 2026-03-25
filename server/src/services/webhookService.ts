/**
 * Webhook Service
 * 后台管理平台 - Webhook 服务
 */

import { generateId } from '../utils/generateId.js';
import { Webhook, WebhookHistory, CreateWebhookRequest, UpdateWebhookRequest, WebhookEvent } from '../models/webhook.js';
import { auditService } from './auditService.js';
import * as fs from 'fs';
import * as path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'webhooks.json');
const HISTORY_FILE = path.join(process.cwd(), 'data', 'webhookHistory.json');

interface WebhookStore {
  webhooks: Webhook[];
}

interface WebhookHistoryStore {
  history: WebhookHistory[];
}

function generateId(prefix: string): string {
  return generateId(prefix);
}

function loadStore<T>(file: string, defaultVal: T): T {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch { /* ignore */ }
  return defaultVal;
}

function saveStore(file: string, data: Record<string, unknown>): void {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

let webhookStore: WebhookStore | null = null;
let historyStore: WebhookHistoryStore | null = null;

function getWebhookStore(): WebhookStore {
  if (!webhookStore) webhookStore = loadStore(DATA_FILE, { webhooks: [] });
  return webhookStore;
}

function getHistoryStore(): WebhookHistoryStore {
  if (!historyStore) historyStore = loadStore(HISTORY_FILE, { history: [] });
  return historyStore;
}

function saveWebhookStore(): void {
  saveStore(DATA_FILE, getWebhookStore());
}

function saveHistoryStore(): void {
  saveStore(HISTORY_FILE, getHistoryStore());
}

export class WebhookService {
  /**
   * 创建 Webhook
   */
  async create(req: CreateWebhookRequest, createdBy: string): Promise<Webhook> {
    const store = getWebhookStore();
    const webhook: Webhook = {
      id: generateId('wh'),
      name: req.name,
      url: req.url,
      secret: req.secret,
      events: req.events,
      headers: req.headers || [],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
      successCount: 0,
      failCount: 0,
    };
    store.webhooks.push(webhook);
    saveWebhookStore();

    await auditService.log({
      action: 'webhook.create',
      actor: createdBy,
      target: webhook.id,
      details: { name: req.name, events: req.events },
    });

    return webhook;
  }

  /**
   * 获取 Webhook 列表
   */
  async list(): Promise<{ list: Webhook[]; total: number }> {
    const store = getWebhookStore();
    return {
      list: store.webhooks.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      total: store.webhooks.length,
    };
  }

  /**
   * 获取单个 Webhook
   */
  async get(id: string): Promise<Webhook | null> {
    const store = getWebhookStore();
    return store.webhooks.find(w => w.id === id) || null;
  }

  /**
   * 更新 Webhook
   */
  async update(id: string, req: UpdateWebhookRequest, updatedBy: string): Promise<Webhook | null> {
    const store = getWebhookStore();
    const idx = store.webhooks.findIndex(w => w.id === id);
    if (idx === -1) return null;

    const updated: Webhook = {
      ...store.webhooks[idx],
      ...req,
      updatedAt: new Date().toISOString(),
    };
    store.webhooks[idx] = updated;
    saveWebhookStore();

    await auditService.log({
      action: 'webhook.update',
      actor: updatedBy,
      target: id,
      details: { changes: req },
    });

    return updated;
  }

  /**
   * 删除 Webhook
   */
  async delete(id: string, deletedBy: string): Promise<boolean> {
    const store = getWebhookStore();
    const idx = store.webhooks.findIndex(w => w.id === id);
    if (idx === -1) return false;

    store.webhooks.splice(idx, 1);
    saveWebhookStore();

    await auditService.log({
      action: 'webhook.delete',
      actor: deletedBy,
      target: id,
    });

    return true;
  }

  /**
   * 获取 Webhook 历史
   */
  async getHistory(webhookId: string, limit: number = 50): Promise<WebhookHistory[]> {
    const store = getHistoryStore();
    return store.history
      .filter(h => h.webhookId === webhookId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * 触发 Webhook（供其他服务调用）
   */
  async trigger(event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
    const store = getWebhookStore();
    const matching = store.webhooks.filter(w =>
      w.status === 'active' && w.events.includes(event)
    );

    for (const webhook of matching) {
      this.sendToWebhook(webhook, event, payload).catch(console.error);
    }
  }

  /**
   * 发送测试通知
   */
  async test(id: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const store = getWebhookStore();
    const webhook = store.webhooks.find(w => w.id === id);
    if (!webhook) return { success: false, error: 'Webhook not found' };

    const payload = {
      event: 'test',
      webhookId: id,
      timestamp: new Date().toISOString(),
      message: 'This is a test notification from TeamClaw',
    };

    const historyStore = getHistoryStore();
    const start = Date.now();
    let statusCode: number | undefined;
    let error: string | undefined;
    let success = false;

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(webhook.headers.map(h => [h.key, h.value])),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      statusCode = res.status;
      success = res.ok;
      if (!res.ok) error = `HTTP ${res.status}`;
    } catch (e: unknown) {
      error = (e as Error).message || 'Request failed';
    }

    const durationMs = Date.now() - start;
    const entry: WebhookHistory = {
      id: generateId('whh'),
      webhookId: webhook.id,
      event: 'test',
      payload,
      responseStatus: statusCode,
      responseBody: success ? 'OK' : error,
      durationMs,
      attempt: 1,
      success,
      error,
      timestamp: new Date().toISOString(),
    };
    historyStore.history.push(entry);
    if (historyStore.history.length > 5000) {
      historyStore.history = historyStore.history.slice(-5000);
    }
    saveHistoryStore();

    // 更新 webhook 统计
    const idx = store.webhooks.findIndex(w => w.id === id);
    if (idx !== -1) {
      store.webhooks[idx].lastTriggerAt = entry.timestamp;
      store.webhooks[idx].lastTriggerStatus = success ? 'success' : 'failed';
      store.webhooks[idx].lastTriggerResponse = success ? 'OK' : error;
      if (success) store.webhooks[idx].successCount++;
      else store.webhooks[idx].failCount++;
      saveWebhookStore();
    }

    await auditService.log({
      action: 'webhook.trigger',
      actor: 'system',
      target: id,
      details: { event: 'test', success },
    });

    return { success, statusCode, error };
  }

  private async sendToWebhook(
    webhook: Webhook,
    event: WebhookEvent,
    payload: Record<string, unknown>
  ): Promise<void> {
    const historyStore = getHistoryStore();
    const store = getWebhookStore();
    const start = Date.now();
    let statusCode: number | undefined;
    let error: string | undefined;
    let success = false;

    try {
      const body = { event, webhookId: webhook.id, timestamp: new Date().toISOString(), data: payload };
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(webhook.headers.map(h => [h.key, h.value])),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      statusCode = res.status;
      success = res.ok;
      if (!res.ok) error = `HTTP ${res.status}`;
    } catch (e: unknown) {
      error = (e as Error).message || 'Request failed';
    }

    const durationMs = Date.now() - start;
    const entry: WebhookHistory = {
      id: generateId('whh'),
      webhookId: webhook.id,
      event,
      payload,
      responseStatus: statusCode,
      durationMs,
      attempt: 1,
      success,
      error,
      timestamp: new Date().toISOString(),
    };
    historyStore.history.push(entry);
    saveHistoryStore();

    const idx = store.webhooks.findIndex(w => w.id === webhook.id);
    if (idx !== -1) {
      store.webhooks[idx].lastTriggerAt = entry.timestamp;
      store.webhooks[idx].lastTriggerStatus = success ? 'success' : 'failed';
      if (success) store.webhooks[idx].successCount++;
      else store.webhooks[idx].failCount++;
      saveWebhookStore();
    }
  }
}

export const webhookService = new WebhookService();

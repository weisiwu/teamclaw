/**
 * Token Stats Service
 * 后台管理平台 - Token 消费统计服务
 *
 * 持久化：PostgreSQL token_usage 表 + 内存缓存
 */

import {
  TokenUsageRecord,
  TokenDailyStats,
  TokenLayerStats,
  TokenTaskStats,
  TokenSummary,
  TokenTrendPoint,
  TokenLayer,
} from '../models/tokenStats.js';
import { tokenStatsRepo, TokenUsageRow } from '../db/repositories/tokenStatsRepo.js';

// Layer cost per 1M tokens (USD)
const LAYER_COSTS: Record<TokenLayer, number> = {
  light: 0.5,
  medium: 3.0,
  strong: 15.0,
};

// In-memory cache (DB as source of truth)
const tokenUsageCache: TokenUsageRecord[] = [];
const CACHE_LOADED_KEY = Symbol('cacheLoaded');

export class TokenStatsService {
  private cacheLoaded = false;

  constructor() {
    this.loadFromDb().catch(err => {
      console.warn('[tokenStats] Failed to load from DB on startup:', err);
    });
  }

  /**
   * 从 DB 加载 token 使用记录到内存缓存
   */
  private async loadFromDb(): Promise<void> {
    try {
      const rows = await tokenStatsRepo.findAll();
      for (const row of rows) {
        tokenUsageCache.push(this.rowToRecord(row));
      }
      this.cacheLoaded = true;
      console.log(`[tokenStats] Loaded ${rows.length} token usage records from PostgreSQL`);
    } catch (err) {
      console.warn('[tokenStats] Could not load from DB:', err);
    }
  }

  private rowToRecord(row: TokenUsageRow): TokenUsageRecord {
    return {
      id: row.id,
      taskId: row.task_id ?? undefined,
      layer: row.layer as TokenLayer,
      inputTokens: Number(row.input_tokens),
      outputTokens: Number(row.output_tokens),
      totalTokens: Number(row.total_tokens),
      cost: Number(row.cost),
      timestamp: row.timestamp.toISOString(),
      model: row.model ?? undefined,
    };
  }

  /**
   * 记录一次 Token 使用
   */
  async recordUsage(record: Omit<TokenUsageRecord, 'id'>): Promise<TokenUsageRecord> {
    const rec: TokenUsageRecord = {
      ...record,
      id: `tu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    tokenUsageCache.push(rec);
    // Persist to DB (non-blocking)
    tokenStatsRepo.upsert({
      id: rec.id,
      taskId: rec.taskId,
      layer: rec.layer,
      inputTokens: rec.inputTokens,
      outputTokens: rec.outputTokens,
      totalTokens: rec.totalTokens,
      cost: rec.cost,
      model: rec.model,
      timestamp: rec.timestamp,
    }).catch(err => console.error('[tokenStats] Failed to persist record:', err));
    return rec;
  }

  /**
   * 获取汇总统计
   */
  async getSummary(startDate?: string, endDate?: string): Promise<TokenSummary> {
    const filtered = this.filterByDate(tokenUsageCache, startDate, endDate);
    // Single-pass computation: accumulate all stats in one iteration
    let totalTokens = 0;
    let totalCost = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    const layerTokensMap: Record<TokenLayer, number> = { light: 0, medium: 0, strong: 0 };
    const layerCostMap: Record<TokenLayer, number> = { light: 0, medium: 0, strong: 0 };

    for (const r of filtered) {
      totalTokens += r.totalTokens;
      totalCost += r.cost;
      inputTokens += r.inputTokens;
      outputTokens += r.outputTokens;
      layerTokensMap[r.layer] += r.totalTokens;
      layerCostMap[r.layer] += r.cost;
    }

    const layers: TokenLayer[] = ['light', 'medium', 'strong'];
    const byLayer: TokenLayerStats[] = layers.map((layer) => {
      const lt = layerTokensMap[layer];
      const lc = layerCostMap[layer];
      return {
        layer,
        tokens: lt,
        cost: parseFloat(lc.toFixed(6)),
        percent: totalTokens > 0 ? parseFloat(((lt / totalTokens) * 100).toFixed(1)) : 0,
      };
    });

    return {
      totalTokens,
      totalCost: parseFloat(totalCost.toFixed(6)),
      inputTokens,
      outputTokens,
      byLayer,
    };
  }

  /**
   * 获取按天统计
   */
  async getDailyStats(startDate?: string, endDate?: string): Promise<TokenDailyStats[]> {
    const filtered = this.filterByDate(tokenUsageCache, startDate, endDate);
    const byDate = new Map<string, TokenDailyStats>();

    filtered.forEach((rec) => {
      const date = rec.timestamp.split('T')[0];
      const existing = byDate.get(date);
      if (existing) {
        existing.inputTokens += rec.inputTokens;
        existing.outputTokens += rec.outputTokens;
        existing.totalTokens += rec.totalTokens;
        existing.cost = parseFloat((existing.cost + rec.cost).toFixed(6));
      } else {
        byDate.set(date, {
          date,
          inputTokens: rec.inputTokens,
          outputTokens: rec.outputTokens,
          totalTokens: rec.totalTokens,
          cost: parseFloat(rec.cost.toFixed(6)),
        });
      }
    });

    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 获取按任务统计
   */
  async getTaskStats(startDate?: string, endDate?: string, limit = 50): Promise<TokenTaskStats[]> {
    const filtered = this.filterByDate(tokenUsageCache, startDate, endDate);
    const byTask = new Map<string, number>();

    filtered.forEach((rec) => {
      const taskId = rec.taskId || 'unknown';
      byTask.set(taskId, (byTask.get(taskId) || 0) + rec.totalTokens);
    });

    return Array.from(byTask.entries())
      .map(([taskId, tokens]) => ({ taskId, tokens }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, limit);
  }

  /**
   * 获取趋势数据
   */
  async getTrend(days = 7): Promise<TokenTrendPoint[]> {
    const result: TokenTrendPoint[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayRecords = tokenUsageCache.filter((r) => r.timestamp.startsWith(dateStr));
      const tokens = dayRecords.reduce((s, r) => s + r.totalTokens, 0);
      const cost = dayRecords.reduce((s, r) => s + r.cost, 0);

      result.push({
        date: dateStr,
        tokens,
        cost: parseFloat(cost.toFixed(6)),
      });
    }

    return result;
  }

  private filterByDate(records: TokenUsageRecord[], startDate?: string, endDate?: string): TokenUsageRecord[] {
    return records.filter((r) => {
      const ts = r.timestamp.split('T')[0];
      if (startDate && ts < startDate) return false;
      if (endDate && ts > endDate) return false;
      return true;
    });
  }
}

export const tokenStatsService = new TokenStatsService();

/**
 * LLM 成本追踪服务
 * 记录每个模型层级的 token 使用量和估算成本
 */
import { estimateCost } from './llmService.js';
class LLMCostTracker {
    records = [];
    dailyCosts = new Map();
    maxRecords = 10000; // 内存中最多保留条数
    /**
     * 记录一次 LLM 调用
     */
    record(response, responseMs, tier) {
        const costUsd = estimateCost(response.provider, response.usage.inputTokens, response.usage.outputTokens);
        const now = Date.now();
        const date = new Date(now).toISOString().slice(0, 10);
        const record = {
            timestamp: now,
            provider: response.provider,
            model: response.model,
            tier,
            inputTokens: response.usage.inputTokens,
            outputTokens: response.usage.outputTokens,
            totalTokens: response.usage.totalTokens,
            costUsd,
            responseMs,
            success: true,
        };
        this.records.push(record);
        // 维护内存上限
        if (this.records.length > this.maxRecords) {
            this.records = this.records.slice(-this.maxRecords);
        }
        // 更新日统计
        if (!this.dailyCosts.has(date)) {
            this.dailyCosts.set(date, {
                date,
                totalCost: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                totalRequests: 0,
                byProvider: {},
            });
        }
        const day = this.dailyCosts.get(date);
        day.totalCost += costUsd;
        day.totalInputTokens += response.usage.inputTokens;
        day.totalOutputTokens += response.usage.outputTokens;
        day.totalRequests += 1;
        if (!day.byProvider[response.provider]) {
            day.byProvider[response.provider] = { totalCost: 0, totalTokens: 0, requests: 0 };
        }
        day.byProvider[response.provider].totalCost += costUsd;
        day.byProvider[response.provider].totalTokens += response.usage.totalTokens;
        day.byProvider[response.provider].requests += 1;
    }
    /**
     * 记录失败调用
     */
    recordFailure(provider, tier, responseMs) {
        const now = Date.now();
        const record = {
            timestamp: now,
            provider,
            model: '',
            tier,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            costUsd: 0,
            responseMs,
            success: false,
        };
        this.records.push(record);
    }
    /**
     * 获取最近 N 条记录
     */
    getRecentRecords(limit = 100) {
        return this.records.slice(-limit);
    }
    /**
     * 按日期获取成本统计
     */
    getDailyStats(date) {
        return this.dailyCosts.get(date) || null;
    }
    /**
     * 获取日期范围的成本统计
     */
    getRangeStats(startDate, endDate) {
        const result = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().slice(0, 10);
            const day = this.dailyCosts.get(dateStr);
            if (day)
                result.push(day);
        }
        return result;
    }
    /**
     * 获取总成本统计（全部内存数据）
     */
    getTotalStats() {
        const totalCost = this.records.reduce((s, r) => s + r.costUsd, 0);
        const totalInputTokens = this.records.reduce((s, r) => s + r.inputTokens, 0);
        const totalOutputTokens = this.records.reduce((s, r) => s + r.outputTokens, 0);
        const successRecords = this.records.filter(r => r.success);
        const successRate = this.records.length > 0 ? successRecords.length / this.records.length : 0;
        const avgResponseMs = this.records.length > 0
            ? this.records.reduce((s, r) => s + r.responseMs, 0) / this.records.length
            : 0;
        const byTier = {};
        const byProvider = {};
        for (const r of this.records) {
            if (!byTier[r.tier])
                byTier[r.tier] = { cost: 0, tokens: 0, requests: 0 };
            byTier[r.tier].cost += r.costUsd;
            byTier[r.tier].tokens += r.totalTokens;
            byTier[r.tier].requests += 1;
            if (!byProvider[r.provider])
                byProvider[r.provider] = { cost: 0, tokens: 0, requests: 0 };
            byProvider[r.provider].cost += r.costUsd;
            byProvider[r.provider].tokens += r.totalTokens;
            byProvider[r.provider].requests += 1;
        }
        return {
            totalCost,
            totalInputTokens,
            totalOutputTokens,
            totalRequests: this.records.length,
            successRate,
            avgResponseMs,
            byTier,
            byProvider,
        };
    }
    /**
     * 获取按天的趋势数据（最近 N 天）
     */
    getTrend(days = 7) {
        const result = [];
        const now = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const day = this.dailyCosts.get(dateStr);
            result.push({
                date: dateStr,
                cost: day?.totalCost || 0,
                tokens: day ? day.totalInputTokens + day.totalOutputTokens : 0,
                requests: day?.totalRequests || 0,
            });
        }
        return result;
    }
    /**
     * 清理旧记录（只保留最近 N 天）
     */
    cleanup(maxDays = 30) {
        const cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;
        this.records = this.records.filter(r => r.timestamp >= cutoff);
        for (const [date] of this.dailyCosts) {
            if (new Date(date).getTime() < cutoff) {
                this.dailyCosts.delete(date);
            }
        }
    }
}
// 单例导出
export const llmCostTracker = new LLMCostTracker();
// 便捷调用包装器
export async function withCostTracking(tier, fn) {
    const start = Date.now();
    try {
        const result = await fn();
        const responseMs = Date.now() - start;
        return { result, responseMs };
    }
    catch (err) {
        const responseMs = Date.now() - start;
        // 记录失败
        llmCostTracker.recordFailure(tier === 'light' ? 'deepseek' : tier === 'medium' ? 'openai' : 'anthropic', tier, responseMs);
        throw err;
    }
}

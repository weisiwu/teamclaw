/**
 * Token Stats Service
 * 后台管理平台 - Token 消费统计服务
 */
// Layer cost per 1M tokens (USD)
const LAYER_COSTS = {
    light: 0.5,
    medium: 3.0,
    strong: 15.0,
};
// In-memory storage
const tokenUsage = [];
// Generate fake historical data on first load
function initFakeData() {
    if (tokenUsage.length > 0)
        return;
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const layers = ['light', 'medium', 'strong'];
        layers.forEach((layer) => {
            const baseTokens = layer === 'light' ? 8000 : layer === 'medium' ? 15000 : 6000;
            const variance = Math.random() * 0.4 + 0.8;
            const tokens = Math.floor(baseTokens * variance);
            const cost = (tokens / 1_000_000) * LAYER_COSTS[layer];
            tokenUsage.push({
                id: `tu_${dateStr}_${layer}_${Math.random().toString(36).slice(2, 6)}`,
                layer,
                inputTokens: Math.floor(tokens * 0.4),
                outputTokens: Math.floor(tokens * 0.6),
                totalTokens: tokens,
                cost: parseFloat(cost.toFixed(6)),
                timestamp: date.toISOString(),
                model: layer === 'light' ? 'deepseek-chat' : layer === 'medium' ? 'gpt-4o-mini' : 'claude-sonnet',
            });
        });
    }
}
export class TokenStatsService {
    constructor() {
        initFakeData();
    }
    /**
     * 记录一次 Token 使用
     */
    async recordUsage(record) {
        const rec = {
            ...record,
            id: `tu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        };
        tokenUsage.push(rec);
        return rec;
    }
    /**
     * 获取汇总统计
     */
    async getSummary(startDate, endDate) {
        const filtered = this.filterByDate(tokenUsage, startDate, endDate);
        // Single-pass computation: accumulate all stats in one iteration
        let totalTokens = 0;
        let totalCost = 0;
        let inputTokens = 0;
        let outputTokens = 0;
        const layerTokensMap = { light: 0, medium: 0, strong: 0 };
        const layerCostMap = { light: 0, medium: 0, strong: 0 };
        for (const r of filtered) {
            totalTokens += r.totalTokens;
            totalCost += r.cost;
            inputTokens += r.inputTokens;
            outputTokens += r.outputTokens;
            layerTokensMap[r.layer] += r.totalTokens;
            layerCostMap[r.layer] += r.cost;
        }
        const layers = ['light', 'medium', 'strong'];
        const byLayer = layers.map((layer) => {
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
    async getDailyStats(startDate, endDate) {
        const filtered = this.filterByDate(tokenUsage, startDate, endDate);
        const byDate = new Map();
        filtered.forEach((rec) => {
            const date = rec.timestamp.split('T')[0];
            const existing = byDate.get(date);
            if (existing) {
                existing.inputTokens += rec.inputTokens;
                existing.outputTokens += rec.outputTokens;
                existing.totalTokens += rec.totalTokens;
                existing.cost = parseFloat((existing.cost + rec.cost).toFixed(6));
            }
            else {
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
    async getTaskStats(startDate, endDate, limit = 50) {
        const filtered = this.filterByDate(tokenUsage, startDate, endDate);
        const byTask = new Map();
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
    async getTrend(days = 7) {
        const result = [];
        const now = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayRecords = tokenUsage.filter((r) => r.timestamp.startsWith(dateStr));
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
    filterByDate(records, startDate, endDate) {
        return records.filter((r) => {
            const ts = r.timestamp.split('T')[0];
            if (startDate && ts < startDate)
                return false;
            if (endDate && ts > endDate)
                return false;
            return true;
        });
    }
}
export const tokenStatsService = new TokenStatsService();

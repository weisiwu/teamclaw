import {
  DailyTokenUsage,
  TaskTokenUsage,
  TrendDataPoint,
  TokenFilters,
  TokenSummaryResponse,
  TokenDailyListResponse,
  TokenTaskListResponse,
  TokenTrendResponse,
} from "./types";

const API_BASE = '/api/v1';

export const tokenApi = {
  // 获取 Token 汇总
  async getSummary(): Promise<TokenSummaryResponse> {
    const res = await fetch(`${API_BASE}/token-stats/summary`);
    const data = await res.json();
    const d = data.data || {};
    return {
      data: {
        totalTokens: d.totalTokens || 0,
        todayTokens: 0,
        weekTokens: 0,
        monthTokens: 0,
        taskCount: 0,
        avgTokensPerTask: 0,
        cost: {
          totalCost: d.totalCost || 0,
          todayCost: 0,
          weekCost: 0,
          monthCost: 0,
          avgCostPerTask: 0,
        },
      },
    };
  },

  // 获取每日 Token 使用列表
  async getDailyList(filters?: TokenFilters): Promise<TokenDailyListResponse> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const qs = params.toString();
    const res = await fetch(`${API_BASE}/token-stats/daily${qs ? `?${qs}` : ''}`);
    const data = await res.json();
    const records = (data.data || []) as Array<{
      date: string;
      totalTokens: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }>;
    const daily: DailyTokenUsage[] = records.map((r) => ({
      date: r.date,
      tokens: r.totalTokens,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      cost: r.cost,
      tasks: 0,
    }));
    return { data: daily, total: daily.length };
  },

  // 获取任务 Token 列表
  async getTaskList(filters?: TokenFilters & { page?: number; pageSize?: number }): Promise<TokenTaskListResponse> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const qs = params.toString();
    const res = await fetch(`${API_BASE}/token-stats/tasks${qs ? `?${qs}` : ''}`);
    const data = await res.json();
    const records = (data.data || []) as Array<{ taskId: string; tokens: number }>;
    const taskUsage: TaskTokenUsage[] = records.map((r) => ({
      taskId: r.taskId,
      taskTitle: r.taskId,
      tokens: r.tokens,
      agents: [],
      completedAt: null,
    }));
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const total = taskUsage.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    return {
      data: taskUsage.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  // 获取趋势数据
  async getTrend(days: number = 30): Promise<TokenTrendResponse> {
    const res = await fetch(`${API_BASE}/token-stats/trend?days=${days}`);
    const data = await res.json();
    const points = (data.data || []) as Array<{
      date: string;
      tokens: number;
      cost: number;
    }>;
    const trend: TrendDataPoint[] = points.map((p) => ({
      date: p.date,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: p.tokens,
    }));
    return { data: trend };
  },
};

export default tokenApi;

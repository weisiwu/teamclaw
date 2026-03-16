import {
  TokenSummary,
  DailyTokenUsage,
  TaskTokenUsage,
  TrendDataPoint,
  TokenFilters,
  TokenSummaryResponse,
  TokenDailyListResponse,
  TokenTaskListResponse,
  TokenTrendResponse,
  ModelType,
} from "./types";

// 计算成本 (基于 token 数量和模型类型)
function calculateCost(tokens: number, modelType: ModelType = "default"): number {
  // 简化计算：假设 40% 输入，60% 输出
  const inputTokens = Math.floor(tokens * 0.4);
  const outputTokens = Math.floor(tokens * 0.6);
  
  const pricing = {
    "gpt-4": { inputPrice: 0.03, outputPrice: 0.06 },
    "gpt-4o": { inputPrice: 0.005, outputPrice: 0.015 },
    "claude-3": { inputPrice: 0.015, outputPrice: 0.075 },
    "claude-3.5": { inputPrice: 0.003, outputPrice: 0.015 },
    "gemini": { inputPrice: 0.00125, outputPrice: 0.005 },
    "default": { inputPrice: 0.01, outputPrice: 0.03 },
  };
  
  const price = pricing[modelType];
  return (inputTokens / 1000) * price.inputPrice + (outputTokens / 1000) * price.outputPrice;
}

// 模拟数据
const mockDailyUsage: DailyTokenUsage[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  const tokens = Math.floor(Math.random() * 50000) + 10000;
  return {
    date: date.toISOString().slice(0, 10),
    tokens,
    tasks: Math.floor(Math.random() * 20) + 1,
    // 新增
    inputTokens: Math.floor(tokens * 0.4),
    outputTokens: Math.floor(tokens * 0.6),
    cost: calculateCost(tokens),
  };
});

const mockTaskUsage: TaskTokenUsage[] = [
  {
    taskId: "t_20260316_001",
    taskTitle: "首页按钮样式修改",
    tokens: 4200,
    agents: ["main", "pm", "coder1"],
    completedAt: "2026-03-16 20:15:00",
    // 新增
    modelType: "claude-3.5",
    status: "completed",
    cost: calculateCost(4200, "claude-3.5"),
  },
  {
    taskId: "t_20260316_002",
    taskTitle: "添加收藏功能",
    tokens: 8500,
    agents: ["pm", "coder1"],
    completedAt: null,
    // 新增
    modelType: "gpt-4o",
    status: "in_progress",
    cost: calculateCost(8500, "gpt-4o"),
  },
  {
    taskId: "t_20260317_001",
    taskTitle: "修复登录页闪烁问题",
    tokens: 12000,
    agents: ["main", "coder1"],
    completedAt: "2026-03-17 10:30:00",
    // 新增
    modelType: "claude-3.5",
    status: "completed",
    cost: calculateCost(12000, "claude-3.5"),
  },
  {
    taskId: "t_20260317_003",
    taskTitle: "数据库优化",
    tokens: 2300,
    agents: ["main", "coder1"],
    completedAt: null,
    // 新增
    modelType: "gpt-4",
    status: "pending",
    cost: calculateCost(2300, "gpt-4"),
  },
  {
    taskId: "t_20260315_002",
    taskTitle: "API 接口优化",
    tokens: 6800,
    agents: ["coder1"],
    completedAt: "2026-03-15 18:00:00",
    // 新增
    modelType: "claude-3.5",
    status: "completed",
    cost: calculateCost(6800, "claude-3.5"),
  },
  {
    taskId: "t_20260314_003",
    taskTitle: "移动端适配",
    tokens: 15000,
    agents: ["main", "pm", "coder1", "coder2"],
    completedAt: "2026-03-14 22:00:00",
    // 新增
    modelType: "gpt-4o",
    status: "completed",
    cost: calculateCost(15000, "gpt-4o"),
  },
  {
    taskId: "t_20260313_001",
    taskTitle: "用户权限模块",
    tokens: 22000,
    agents: ["main", "pm", "coder1", "coder2"],
    completedAt: "2026-03-13 19:00:00",
    // 新增
    modelType: "gpt-4",
    status: "completed",
    cost: calculateCost(22000, "gpt-4"),
  },
];

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 计算汇总数据
function calculateSummary(): TokenSummary {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthAgoStr = monthAgo.toISOString().slice(0, 10);

  const todayData = mockDailyUsage.find((d) => d.date === today);
  const weekData = mockDailyUsage.filter((d) => d.date >= weekAgoStr);
  const monthData = mockDailyUsage.filter((d) => d.date >= monthAgoStr);

  const completedTasks = mockTaskUsage.filter((t) => t.status === "completed");
  const totalTaskTokens = completedTasks.reduce((sum, t) => sum + t.tokens, 0);

  // 计算成本
  const todayCost = todayData?.cost || 0;
  const weekCost = weekData.reduce((sum, d) => sum + (d.cost || 0), 0);
  const monthCost = monthData.reduce((sum, d) => sum + (d.cost || 0), 0);
  const totalCost = mockDailyUsage.reduce((sum, d) => sum + (d.cost || 0), 0);
  const avgCostPerTask = completedTasks.length > 0 
    ? completedTasks.reduce((sum, t) => sum + (t.cost || 0), 0) / completedTasks.length 
    : 0;

  return {
    totalTokens: mockDailyUsage.reduce((sum, d) => sum + d.tokens, 0),
    todayTokens: todayData?.tokens || 0,
    weekTokens: weekData.reduce((sum, d) => sum + d.tokens, 0),
    monthTokens: monthData.reduce((sum, d) => sum + d.tokens, 0),
    taskCount: completedTasks.length,
    avgTokensPerTask: completedTasks.length > 0 ? Math.round(totalTaskTokens / completedTasks.length) : 0,
    // 新增成本字段
    cost: {
      totalCost,
      todayCost,
      weekCost,
      monthCost,
      avgCostPerTask,
    },
  };
}

// 计算趋势数据 (扩展)
function calculateTrend(): TrendDataPoint[] {
  return mockDailyUsage.map((d) => ({
    date: d.date,
    inputTokens: d.inputTokens || Math.floor(d.tokens * 0.4),
    outputTokens: d.outputTokens || Math.floor(d.tokens * 0.6),
    totalTokens: d.tokens,
  }));
}

// Token API
export const tokenApi = {
  // 获取 Token 汇总
  async getSummary(): Promise<TokenSummaryResponse> {
    await delay(300);
    return {
      data: calculateSummary(),
    };
  },

  // 获取每日 Token 使用列表
  async getDailyList(filters?: TokenFilters): Promise<TokenDailyListResponse> {
    await delay(300);
    let filtered = [...mockDailyUsage];

    if (filters?.startDate) {
      filtered = filtered.filter((d) => d.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      filtered = filtered.filter((d) => d.date <= filters.endDate!);
    }

    return {
      data: filtered,
      total: filtered.length,
    };
  },

  // 获取任务 Token 列表
  async getTaskList(filters?: TokenFilters & { page?: number; pageSize?: number }): Promise<TokenTaskListResponse> {
    await delay(300);
    let filtered = [...mockTaskUsage];

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.taskId.toLowerCase().includes(searchLower) ||
          t.taskTitle.toLowerCase().includes(searchLower)
      );
    }

    // 新增: 按模型类型筛选
    if (filters?.modelType && filters.modelType !== "all") {
      filtered = filtered.filter((t) => t.modelType === filters.modelType);
    }

    // 新增: 按任务状态筛选
    if (filters?.status && filters.status !== "all") {
      filtered = filtered.filter((t) => t.status === filters.status);
    }

    // 分页
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  // 获取趋势数据
  async getTrend(days: number = 30): Promise<TokenTrendResponse> {
    await delay(300);
    const trendData = calculateTrend();
    return {
      data: trendData.slice(-days),
    };
  },
};

export default tokenApi;

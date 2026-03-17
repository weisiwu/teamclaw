import { CronTask, CreateCronRequest, UpdateCronRequest, CronListResponse, CronRunLog } from "./types";

// 模拟数据
const mockCronTasks: CronTask[] = [
  {
    id: "cron_001",
    name: "每日数据汇总",
    cron: "0 2 * * *",
    prompt: "请汇总昨天的销售数据并生成报告",
    status: "running",
    createdAt: "2026-03-01 10:00:00",
    lastRunAt: "2026-03-16 02:00:00",
    nextRunAt: "2026-03-17 02:00:00",
    runs: [],
  },
  {
    id: "cron_002",
    name: "每周周报生成",
    cron: "0 9 * * 1",
    prompt: "请生成上周的周报，包含任务完成情况和团队动态",
    status: "running",
    createdAt: "2026-03-01 10:00:00",
    lastRunAt: "2026-03-09 09:00:00",
    nextRunAt: "2026-03-23 09:00:00",
    runs: [],
  },
  {
    id: "cron_003",
    name: "库存检查提醒",
    cron: "0 8 * * *",
    prompt: "请检查库存低于阈值的商品并生成补货建议",
    status: "stopped",
    createdAt: "2026-03-05 14:00:00",
    lastRunAt: "2026-03-15 08:00:00",
    nextRunAt: null,
    runs: [],
  },
  {
    id: "cron_004",
    name: "用户活跃度分析",
    cron: "0 0 * * *",
    prompt: "请分析昨天的用户活跃数据并生成趋势报告",
    status: "running",
    createdAt: "2026-03-10 16:00:00",
    lastRunAt: "2026-03-16 00:00:00",
    nextRunAt: "2026-03-17 00:00:00",
    runs: [],
  },
];

// 模拟运行日志数据
const mockCronRunLogs: CronRunLog[] = [
  { id: "run_001", cronId: "cron_001", startTime: "2026-03-16 02:00:00", endTime: "2026-03-16 02:05:30", status: "success", output: "汇总完成：销售总额 125,680 元，订单数 328 笔", error: null },
  { id: "run_002", cronId: "cron_001", startTime: "2026-03-15 02:00:00", endTime: "2026-03-15 02:03:45", status: "success", output: "汇总完成：销售总额 98,450 元，订单数 256 笔", error: null },
  { id: "run_003", cronId: "cron_001", startTime: "2026-03-14 02:00:00", endTime: "2026-03-14 02:08:20", status: "failed", output: "", error: "API 请求超时" },
  { id: "run_004", cronId: "cron_002", startTime: "2026-03-09 09:00:00", endTime: "2026-03-09 09:12:30", status: "success", output: "周报已生成，共完成任务 45 个", error: null },
  { id: "run_005", cronId: "cron_003", startTime: "2026-03-15 08:00:00", endTime: "2026-03-15 08:01:15", status: "success", output: "发现 5 个商品需要补货", error: null },
  { id: "run_006", cronId: "cron_004", startTime: "2026-03-16 00:00:00", endTime: "2026-03-16 00:03:20", status: "success", output: "活跃用户 1,256 人，同比增长 12%", error: null },
  { id: "run_007", cronId: "cron_004", startTime: "2026-03-15 00:00:00", endTime: "2026-03-15 00:02:50", status: "success", output: "活跃用户 1,120 人，同比增长 8%", error: null },
];

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 模拟 API 实现
let cronTasks = [...mockCronTasks];

export const cronApi = {
  // 获取定时任务列表
  async getList(): Promise<CronListResponse> {
    await delay(300);
    return {
      data: cronTasks,
      total: cronTasks.length,
    };
  },

  // 获取定时任务详情
  async getById(id: string): Promise<CronTask | null> {
    await delay(200);
    return cronTasks.find((c) => c.id === id) || null;
  },

  // 创建定时任务
  async create(data: CreateCronRequest): Promise<CronTask> {
    await delay(300);
    const newCron: CronTask = {
      id: `cron_${String(cronTasks.length + 1).padStart(3, "0")}`,
      name: data.name,
      cron: data.cron,
      prompt: data.prompt,
      status: "running",
      createdAt: new Date().toLocaleString("zh-CN"),
      lastRunAt: null,
      nextRunAt: null,
    };
    cronTasks = [newCron, ...cronTasks];
    return newCron;
  },

  // 更新定时任务
  async update(id: string, data: UpdateCronRequest): Promise<CronTask> {
    await delay(300);
    const index = cronTasks.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("定时任务不存在");

    cronTasks[index] = { ...cronTasks[index], ...data };
    return cronTasks[index];
  },

  // 删除定时任务
  async delete(id: string): Promise<void> {
    await delay(300);
    cronTasks = cronTasks.filter((c) => c.id !== id);
  },

  // 启动定时任务
  async start(id: string): Promise<CronTask> {
    await delay(300);
    const index = cronTasks.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("定时任务不存在");

    cronTasks[index] = { 
      ...cronTasks[index], 
      status: "running",
      nextRunAt: new Date(Date.now() + 60000).toLocaleString("zh-CN"), // 1分钟后
    };
    return cronTasks[index];
  },

  // 停止定时任务
  async stop(id: string): Promise<CronTask> {
    await delay(300);
    const index = cronTasks.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("定时任务不存在");

    cronTasks[index] = { 
      ...cronTasks[index], 
      status: "stopped",
      nextRunAt: null,
    };
    return cronTasks[index];
  },

  // 获取运行日志
  async getRuns(cronId: string): Promise<CronRunLog[]> {
    await delay(200);
    return mockCronRunLogs
      .filter((log) => log.cronId === cronId)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  },
};

export default cronApi;

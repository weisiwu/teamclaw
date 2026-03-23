import { Task, TaskFilters, TaskListResponse, CreateTaskRequest, UpdateTaskRequest, TaskComment } from "./types";

// 模拟评论数据
const mockComments: TaskComment[] = [
  { id: "c_001", taskId: "t_20260316_001", author: "管理员A", content: "建议使用 CSS 变量统一管理颜色", createdAt: "2026-03-16 20:05:00" },
  { id: "c_002", taskId: "t_20260316_001", author: "coder1", content: "已采用 CSS 变量实现", createdAt: "2026-03-16 20:10:00" },
  { id: "c_003", taskId: "t_20260316_002", author: "pm", content: "需要考虑未登录用户的收藏功能", createdAt: "2026-03-16 21:15:00" },
];

let comments = [...mockComments];

// 模拟数据
const mockTasks: Task[] = [
  {
    id: "t_20260316_001",
    title: "首页按钮样式修改",
    description: "修改首页主按钮背景色为 #1677FF，字号从 14px 调整为 16px",
    status: "completed",
    priority: 10,
    creator: "管理员A",
    createdAt: "2026-03-16 20:01:00",
    completedAt: "2026-03-16 20:15:00",
    duration: 14,
    changes: "修改首页主按钮背景色为 #1677FF，字号从 14px 调整为 16px",
    changedFiles: ["src/pages/Home/index.tsx"],
    commits: ["a1b2c3d: 修改首页按钮样式"],
    agents: ["main", "pm", "coder1"],
    tokenCost: 4200,
    tags: ["UI", "首页", "样式"],
  },
  {
    id: "t_20260316_002",
    title: "添加收藏功能",
    description: "在商品详情页添加收藏按钮，支持本地存储",
    status: "in_progress",
    priority: 7,
    creator: "管理员B",
    createdAt: "2026-03-16 21:00:00",
    completedAt: null,
    duration: null,
    changes: "",
    changedFiles: [],
    commits: [],
    agents: ["pm", "coder1"],
    tokenCost: 8500,
    tags: ["功能", "收藏"],
  },
  {
    id: "t_20260317_001",
    title: "修复登录页闪烁问题",
    description: "登录页面加载时有短暂白屏，需要优化",
    status: "pending",
    priority: 8,
    creator: "管理员A",
    createdAt: "2026-03-17 09:00:00",
    completedAt: null,
    duration: null,
    changes: "",
    changedFiles: [],
    commits: [],
    agents: [],
    tokenCost: 0,
    tags: ["Bug", "登录"],
  },
  {
    id: "t_20260315_003",
    title: "性能优化",
    description: "优化首屏加载时间",
    status: "cancelled",
    priority: 5,
    creator: "管理员C",
    createdAt: "2026-03-15 10:00:00",
    completedAt: null,
    duration: null,
    changes: "",
    changedFiles: [],
    commits: [],
    agents: [],
    tokenCost: 0,
    tags: ["性能"],
  },
  {
    id: "t_20260317_002",
    title: "用户反馈处理",
    description: "处理用户反馈的若干问题",
    status: "pending",
    priority: 6,
    creator: "管理员A",
    createdAt: "2026-03-17 10:30:00",
    completedAt: null,
    duration: null,
    changes: "",
    changedFiles: [],
    commits: [],
    agents: [],
    tokenCost: 0,
    tags: ["反馈"],
  },
  {
    id: "t_20260317_003",
    title: "数据库优化",
    description: "优化查询性能，添加索引",
    status: "in_progress",
    priority: 9,
    creator: "管理员B",
    createdAt: "2026-03-17 11:00:00",
    completedAt: null,
    duration: null,
    changes: "",
    changedFiles: [],
    commits: [],
    agents: ["main", "coder1"],
    tokenCost: 2300,
    tags: ["性能", "数据库"],
  },
];

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 模拟 API 实现
let tasks = [...mockTasks];

export const taskApi = {
  // 获取任务列表
  async getList(filters: TaskFilters): Promise<TaskListResponse> {
    await delay(50); // 模拟网络延迟（已优化）

    let filtered = [...tasks];

    // 搜索筛选
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower) ||
          t.id.toLowerCase().includes(searchLower)
      );
    }

    // 状态筛选
    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter((t) => t.status === filters.status);
    }

    // 优先级筛选
    if (filters.priority && filters.priority !== "all") {
      filtered = filtered.filter((t) => {
        if (filters.priority === "10") return t.priority === 10;
        if (filters.priority === "8") return t.priority >= 8 && t.priority <= 9;
        if (filters.priority === "5") return t.priority >= 5 && t.priority <= 7;
        if (filters.priority === "low") return t.priority <= 4;
        return true;
      });
    }

    // 分页
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
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

  // 获取任务详情
  async getById(id: string): Promise<Task | null> {
    await delay(50);
    return tasks.find((t) => t.id === id) || null;
  },

  // 创建任务
  async create(data: CreateTaskRequest): Promise<Task> {
    await delay(50);
    const newTask: Task = {
      id: `t_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_${String(tasks.length + 1).padStart(3, "0")}`,
      title: data.title,
      description: data.description,
      status: "pending",
      priority: data.priority,
      creator: "当前用户",
      createdAt: new Date().toLocaleString("zh-CN"),
      completedAt: null,
      duration: null,
      changes: "",
      changedFiles: [],
      commits: [],
      agents: [],
      tokenCost: 0,
      tags: [],
    };
    tasks = [newTask, ...tasks];
    return newTask;
  },

  // 更新任务
  async update(id: string, data: UpdateTaskRequest): Promise<Task> {
    await delay(50);
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) throw new Error("任务不存在");

    tasks[index] = { ...tasks[index], ...data };
    return tasks[index];
  },

  // 删除任务
  async delete(id: string): Promise<void> {
    await delay(50);
    tasks = tasks.filter((t) => t.id !== id);
  },

  // 完成任务
  async complete(id: string): Promise<Task> {
    await delay(50);
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) throw new Error("任务不存在");

    const completedAt = new Date().toLocaleString("zh-CN");
    const duration = Math.floor(
      (new Date().getTime() - new Date(tasks[index].createdAt).getTime()) / 60000
    );

    tasks[index] = {
      ...tasks[index],
      status: "completed",
      completedAt,
      duration,
    };
    return tasks[index];
  },

  // 取消任务
  async cancel(id: string): Promise<Task> {
    await delay(50);
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) throw new Error("任务不存在");

    tasks[index] = { ...tasks[index], status: "cancelled" };
    return tasks[index];
  },

  // 重新打开任务
  async reopen(id: string): Promise<Task> {
    await delay(50);
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) throw new Error("任务不存在");

    tasks[index] = {
      ...tasks[index],
      status: "pending",
      completedAt: null,
      duration: null,
    };
    return tasks[index];
  },

  // 获取任务评论列表
  async getComments(taskId: string): Promise<TaskComment[]> {
    await delay(50);
    return comments.filter((c) => c.taskId === taskId).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  // 添加任务评论
  async addComment(taskId: string, content: string, author: string = "当前用户"): Promise<TaskComment> {
    await delay(50);
    const newComment: TaskComment = {
      id: `c_${Date.now()}`,
      taskId,
      author,
      content,
      createdAt: new Date().toLocaleString("zh-CN"),
    };
    comments.push(newComment);
    return newComment;
  },

  // 删除评论
  async deleteComment(commentId: string): Promise<void> {
    await delay(50);
    comments = comments.filter((c) => c.id !== commentId);
  },
};

export default taskApi;

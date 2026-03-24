import { Task, TaskFilters, TaskListResponse, CreateTaskRequest, UpdateTaskRequest, TaskComment } from "./types";

const API_BASE = "/api/v1";

// ========== Status normalization (frontend ↔ server) ==========
// Server statuses: 'pending' | 'running' | 'done' | 'failed' | 'suspended' | 'cancelled'
// Frontend statuses: 'pending' | 'in_progress' | 'completed' | 'cancelled'
const SERVER_TO_FRONTEND_STATUS: Record<string, string> = {
  pending: "pending",
  running: "in_progress",
  done: "completed",
  failed: "cancelled",
  suspended: "cancelled",
  cancelled: "cancelled",
};

const FRONTEND_TO_SERVER_STATUS: Record<string, string> = {
  pending: "pending",
  in_progress: "running",
  completed: "done",
  cancelled: "cancelled",
};

// ========== Priority normalization (server string → frontend number) ==========
// Server: 'low' | 'normal' | 'high' | 'urgent'
// Frontend: 1-10 scale
const SERVER_TO_FRONTEND_PRIORITY: Record<string, number> = {
  low: 3,
  normal: 5,
  high: 8,
  urgent: 10,
};

const FRONTEND_TO_SERVER_PRIORITY: Record<number, string> = {
  1: "low",
  2: "low",
  3: "low",
  4: "normal",
  5: "normal",
  6: "normal",
  7: "normal",
  8: "high",
  9: "high",
  10: "urgent",
};

// ========== Task normalization (server → frontend format) ==========
function normalizeTask(raw: Record<string, unknown>): Task {
  const status = (raw.status as string) || "pending";
  const priority = raw.priority as string | number;

  return {
    id: (raw.taskId as string) || (raw.id as string) || "",
    title: (raw.title as string) || "",
    description: (raw.description as string) || "",
    status: (SERVER_TO_FRONTEND_STATUS[status] || "pending") as Task["status"],
    priority: typeof priority === "number"
      ? (priority as Task["priority"])
      : (SERVER_TO_FRONTEND_PRIORITY[priority as string] || 5) as Task["priority"],
    creator: (raw.createdBy as string) || (raw.creator as string) || "",
    createdAt: (raw.createdAt as string) || "",
    completedAt: (raw.completedAt as string) || null,
    duration: raw.duration as number | null ?? null,
    changes: (raw.changes as string) || "",
    changedFiles: (raw.changedFiles as string[]) || [],
    commits: (raw.commits as string[]) || [],
    agents: (raw.agents as string[]) || [],
    tokenCost: (raw.tokenCost as number) || 0,
    tags: (raw.tags as string[]) || [],
    // Extra fields the frontend uses but server also provides
    sessionId: raw.sessionId as string | undefined,
    assignedAgent: raw.assignedAgent as string | undefined,
    result: raw.result as string | undefined,
    progress: (raw.progress as number) || 0,
    startedAt: raw.startedAt as string | undefined,
  };
}

function normalizeTaskList(raw: Record<string, unknown>[]): Task[] {
  return raw.map(normalizeTask);
}

// ========== Request normalization (frontend → server format) ==========
function normalizeCreateRequest(data: CreateTaskRequest): Record<string, unknown> {
  return {
    ...data,
    priority: data.priority
      ? (FRONTEND_TO_SERVER_PRIORITY[data.priority] || data.priority)
      : "normal",
  };
}

function normalizeUpdateRequest(data: UpdateTaskRequest): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...data };
  if (data.status) {
    normalized.status = FRONTEND_TO_SERVER_STATUS[data.status] || data.status;
  }
  if (data.priority) {
    normalized.priority = FRONTEND_TO_SERVER_PRIORITY[data.priority] || data.priority;
  }
  return normalized;
}

export const taskApi = {
  // 获取任务列表
  async getList(filters: TaskFilters): Promise<TaskListResponse> {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status && filters.status !== "all") {
      params.set("status", FRONTEND_TO_SERVER_STATUS[filters.status] || filters.status);
    }
    if (filters.priority && filters.priority !== "all") params.set("priority", filters.priority);
    params.set("page", String(filters.page || 1));
    params.set("pageSize", String(filters.pageSize || 10));

    const res = await fetch(`${API_BASE}/tasks?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `获取任务列表失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      // Normalize server response to frontend format
      const raw = json.data;
      return {
        data: normalizeTaskList(raw.data || []),
        total: raw.total ?? 0,
        page: raw.page ?? 1,
        pageSize: raw.pageSize ?? 10,
        totalPages: raw.totalPages ?? 1,
      };
    }
    throw new Error(json.message || "获取任务列表失败");
  },

  // 获取任务详情
  async getById(id: string): Promise<Task | null> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `获取任务详情失败 (${res.status})`);
    }
    const json = await res.json();
    if ((json.code === 200 || json.code === 0) && json.data) {
      return normalizeTask(json.data as Record<string, unknown>);
    }
    return null;
  },

  // 创建任务
  async create(data: CreateTaskRequest): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizeCreateRequest(data)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `创建任务失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return normalizeTask(json.data as Record<string, unknown>);
    }
    throw new Error(json.message || "创建任务失败");
  },

  // 更新任务
  async update(id: string, data: UpdateTaskRequest): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizeUpdateRequest(data)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `更新任务失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return normalizeTask(json.data as Record<string, unknown>);
    }
    throw new Error(json.message || "更新任务失败");
  },

  // 删除任务
  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `删除任务失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code !== 200 && json.code !== 0) {
      throw new Error(json.message || "删除任务失败");
    }
  },

  // 完成任务 - use PATCH with 'completed' status (normalized to 'done')
  async complete(id: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `完成任务失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return normalizeTask(json.data as Record<string, unknown>);
    }
    throw new Error(json.message || "完成任务失败");
  },

  // 取消任务 - use POST /cancel (Express uses POST not PUT)
  async cancel(id: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `取消任务失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      // cancel returns { taskId, cancelled } - fetch updated task
      return await this.getById(id) ?? ({} as Task);
    }
    throw new Error(json.message || "取消任务失败");
  },

  // 重新打开任务 - use PATCH with 'pending' status
  async reopen(id: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `重新打开任务失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return normalizeTask(json.data as Record<string, unknown>);
    }
    throw new Error(json.message || "重新打开任务失败");
  },

  // 获取任务评论列表
  async getComments(taskId: string): Promise<TaskComment[]> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}/comments`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `获取评论列表失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data || [];
    }
    throw new Error(json.message || "获取评论列表失败");
  },

  // 添加任务评论
  async addComment(taskId: string, content: string, author = "当前用户"): Promise<TaskComment> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, author }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `添加评论失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || "添加评论失败");
  },

  // 删除评论
  async deleteComment(commentId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `删除评论失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code !== 200 && json.code !== 0) {
      throw new Error(json.message || "删除评论失败");
    }
  },
};

export default taskApi;

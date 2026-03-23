import { Task, TaskFilters, TaskListResponse, CreateTaskRequest, UpdateTaskRequest, TaskComment } from "./types";

const API_BASE = "/api/v1";

export const taskApi = {
  // 获取任务列表
  async getList(filters: TaskFilters): Promise<TaskListResponse> {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.priority && filters.priority !== 'all') params.set('priority', filters.priority);
    params.set('page', String(filters.page || 1));
    params.set('pageSize', String(filters.pageSize || 10));

    const res = await fetch(`${API_BASE}/tasks?${params}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `获取任务列表失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || '获取任务列表失败');
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
      return json.data;
    }
    return null;
  },

  // 创建任务
  async create(data: CreateTaskRequest): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `创建任务失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || '创建任务失败');
  },

  // 更新任务
  async update(id: string, data: UpdateTaskRequest): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `更新任务失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || '更新任务失败');
  },

  // 删除任务
  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `删除任务失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code !== 200 && json.code !== 0) {
      throw new Error(json.message || '删除任务失败');
    }
  },

  // 完成任务
  async complete(id: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}/complete`, {
      method: 'PUT',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `完成任务失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || '完成任务失败');
  },

  // 取消任务
  async cancel(id: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}/cancel`, {
      method: 'PUT',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `取消任务失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || '取消任务失败');
  },

  // 重新打开任务
  async reopen(id: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}/reopen`, {
      method: 'PUT',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `重新打开任务失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || '重新打开任务失败');
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
    throw new Error(json.message || '获取评论列表失败');
  },

  // 添加任务评论
  async addComment(taskId: string, content: string, author: string = "当前用户"): Promise<TaskComment> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    throw new Error(json.message || '添加评论失败');
  },

  // 删除评论
  async deleteComment(commentId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `删除评论失败 (${res.status})`);
    }
    const json = await res.json();
    if (json.code !== 200 && json.code !== 0) {
      throw new Error(json.message || '删除评论失败');
    }
  },
};

export default taskApi;

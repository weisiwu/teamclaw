import { CronTask, CreateCronRequest, UpdateCronRequest, CronListResponse, CronRunLog } from "./types";

const API_BASE = '/api/v1';

export const cronApi = {
  // 获取定时任务列表
  async getList(): Promise<CronListResponse> {
    const res = await fetch(`${API_BASE}/cron-jobs`);
    const data = await res.json();
    return data.data || { data: [], total: 0 };
  },

  // 获取定时任务详情
  async getById(id: string): Promise<CronTask | null> {
    const res = await fetch(`${API_BASE}/cron-jobs/${id}`);
    const data = await res.json();
    return data.data || null;
  },

  // 创建定时任务
  async create(req: CreateCronRequest): Promise<CronTask> {
    const res = await fetch(`${API_BASE}/cron-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '创建失败');
    return data.data;
  },

  // 更新定时任务
  async update(id: string, req: UpdateCronRequest): Promise<CronTask> {
    const res = await fetch(`${API_BASE}/cron-jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '更新失败');
    return data.data;
  },

  // 删除定时任务
  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/cron-jobs/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '删除失败');
  },

  // 启动定时任务 (toggle on)
  async start(id: string): Promise<CronTask> {
    const res = await fetch(`${API_BASE}/cron-jobs/${id}/toggle`, { method: 'PUT' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '启动失败');
    return data.data;
  },

  // 停止定时任务 (toggle off)
  async stop(id: string): Promise<CronTask> {
    const res = await fetch(`${API_BASE}/cron-jobs/${id}/toggle`, { method: 'PUT' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '停止失败');
    return data.data;
  },

  // 手动触发
  async trigger(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/cron-jobs/${id}/trigger`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '触发失败');
  },

  // 获取运行日志
  async getRuns(cronId: string): Promise<CronRunLog[]> {
    const res = await fetch(`${API_BASE}/cron-jobs/${cronId}/runs`);
    const data = await res.json();
    return data.data || [];
  },
};

export default cronApi;

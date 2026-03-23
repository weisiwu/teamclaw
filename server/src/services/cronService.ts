/**
 * Cron Service
 * 后台管理平台 - 定时任务调度服务
 */

import { CronJob, CronRun, CreateCronJobRequest, UpdateCronJobRequest } from '../models/cronJob.js';
import * as cron from 'node-cron';
import { getFeishuConfig, sendFeishuMessage } from './feishuService.js';

// In-memory storage (替换为 DB/Redis 时修改此处)
const cronJobs = new Map<string, CronJob>();
const cronRuns = new Map<string, CronRun[]>();
const scheduledTasks = new Map<string, cron.ScheduledTask>();

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseCronNextRun(cronExpr: string): string | null {
  try {
    // node-cron doesn't have a built-in next run calculator,
    // so we do simple estimation for display
    const parts = cronExpr.split(' ');
    if (parts.length !== 5) return null;
    const [minute, hour, dayOfMonth] = parts;
    const now = new Date();
    const next = new Date(now);
    if (minute !== '*') next.setMinutes(parseInt(minute));
    if (hour !== '*') next.setHours(parseInt(hour));
    if (dayOfMonth !== '*') next.setDate(parseInt(dayOfMonth));
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  } catch {
    return null;
  }
}

export class CronService {
  /**
   * 创建定时任务
   */
  async create(req: CreateCronJobRequest): Promise<CronJob> {
    const now = new Date().toISOString();
    const job: CronJob = {
      id: generateId('cron'),
      name: req.name,
      cron: req.cron,
      prompt: req.prompt,
      status: req.enabled !== false ? 'active' : 'paused',
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      runCount: 0,
      successCount: 0,
      failCount: 0,
      enabled: req.enabled !== false,
      nextRunAt: req.enabled !== false ? parseCronNextRun(req.cron) : undefined,
    };
    cronJobs.set(job.id, job);
    cronRuns.set(job.id, []);

    if (job.enabled && this.validateCronExpression(job.cron)) {
      this.scheduleJob(job);
    }

    return job;
  }

  /**
   * 获取所有定时任务
   */
  async list(): Promise<{ list: CronJob[]; total: number }> {
    return {
      list: Array.from(cronJobs.values()).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      total: cronJobs.size,
    };
  }

  /**
   * 获取单个定时任务
   */
  async get(id: string): Promise<CronJob | null> {
    return cronJobs.get(id) || null;
  }

  /**
   * 更新定时任务
   */
  async update(id: string, req: UpdateCronJobRequest): Promise<CronJob | null> {
    const job = cronJobs.get(id);
    if (!job) return null;

    const wasEnabled = job.enabled;
    if (req.name !== undefined) job.name = req.name;
    if (req.cron !== undefined) job.cron = req.cron;
    if (req.prompt !== undefined) job.prompt = req.prompt;
    if (req.enabled !== undefined) {
      job.enabled = req.enabled;
      job.status = req.enabled ? 'active' : 'paused';
    }
    job.updatedAt = new Date().toISOString();

    if (wasEnabled && job.enabled) {
      // Reschedule if cron changed
      this.unscheduleJob(id);
      this.scheduleJob(job);
    } else if (wasEnabled && !job.enabled) {
      this.unscheduleJob(id);
    } else if (!wasEnabled && job.enabled) {
      this.scheduleJob(job);
    }

    return job;
  }

  /**
   * 删除定时任务
   */
  async delete(id: string): Promise<boolean> {
    this.unscheduleJob(id);
    cronRuns.delete(id);
    return cronJobs.delete(id);
  }

  /**
   * 启动定时任务
   */
  async start(id: string): Promise<CronJob | null> {
    const job = cronJobs.get(id);
    if (!job) return null;
    job.enabled = true;
    job.status = 'active';
    job.updatedAt = new Date().toISOString();
    job.nextRunAt = parseCronNextRun(job.cron);
    this.scheduleJob(job);
    return job;
  }

  /**
   * 停止定时任务
   */
  async stop(id: string): Promise<CronJob | null> {
    const job = cronJobs.get(id);
    if (!job) return null;
    job.enabled = false;
    job.status = 'paused';
    job.updatedAt = new Date().toISOString();
    this.unscheduleJob(id);
    return job;
  }

  /**
   * 获取运行记录
   */
  async getRuns(id: string, limit = 20): Promise<CronRun[]> {
    const runs = cronRuns.get(id) || [];
    return runs.slice(-limit).reverse();
  }

  /**
   * 触发一次执行（手动触发）
   */
  async trigger(id: string): Promise<CronRun | null> {
    const job = cronJobs.get(id);
    if (!job) return null;

    const run: CronRun = {
      id: generateId('run'),
      cronJobId: id,
      startTime: new Date().toISOString(),
      status: 'running',
    };
    const runs = cronRuns.get(id) || [];
    runs.push(run);
    cronRuns.set(id, runs);

    job.status = 'running';
    job.lastRunAt = run.startTime;
    job.runCount += 1;

    // 实际发送到飞书群聊
    this.executeAndSend(job, run).catch(err => {
      console.error(`[cronService] trigger error for job ${id}:`, err);
    });

    return run;
  }

  private async executeAndSend(job: CronJob, run: CronRun): Promise<void> {
    const startTime = Date.now();
    let success = false;
    let output: string | undefined;
    let errorMsg: string | undefined;

    try {
      const feishuConfig = getFeishuConfig();
      if (!feishuConfig?.chatId) {
        // 没有配置飞书群聊时，只记录日志
        console.log(`[cronService] Feishu not configured, would send to cron job ${job.id}: ${job.prompt}`);
        output = `Cron Job "${job.name}" 触发（飞书未配置，消息未发送）`;
        success = true;
      } else {
        const result = await sendFeishuMessage({
          appId: feishuConfig.appId,
          appSecret: feishuConfig.appSecret,
          receiveIdType: 'chat_id',
          receiveId: feishuConfig.chatId,
          msgType: 'text',
          content: JSON.stringify({ text: `[Cron] ${job.name}\n\n${job.prompt}` }),
        });
        output = `Prompt 已发送至群聊 (messageId: ${result.messageId}): "${job.prompt.slice(0, 50)}..."`;
        success = true;
        console.log(`[cronService] Sent cron prompt for job ${job.id} to Feishu: ${result.messageId}`);
      }
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[cronService] Failed to send cron prompt for job ${job.id}:`, err);
    }

    const endTime = new Date().toISOString();
    run.endTime = endTime;
    run.status = success ? 'success' : 'failed';
    run.durationMs = Date.now() - new Date(run.startTime).getTime();
    run.output = output;
    run.error = errorMsg;

    const cronJob = cronJobs.get(run.cronJobId);
    if (cronJob) {
      cronJob.status = cronJob.enabled ? 'active' : 'paused';
      cronJob.lastRunStatus = run.status;
      cronJob.lastRunOutput = run.output;
      cronJob.lastRunError = run.error;
      if (success) {
        cronJob.successCount += 1;
      } else {
        cronJob.failCount += 1;
      }
      cronJob.nextRunAt = parseCronNextRun(cronJob.cron);
      cronJob.updatedAt = new Date().toISOString();
    }
  }

  /**
   * 校验 Cron 表达式
   */
  validateCronExpression(expr: string): boolean {
    return cron.validate(expr);
  }

  private scheduleJob(job: CronJob): void {
    if (!this.validateCronExpression(job.cron)) return;
    const task = cron.schedule(job.cron, () => {
      this.trigger(job.id);
    });
    scheduledTasks.set(job.id, task);
  }

  private unscheduleJob(id: string): void {
    const task = scheduledTasks.get(id);
    if (task) {
      task.stop();
      scheduledTasks.delete(id);
    }
  }
}

export const cronService = new CronService();

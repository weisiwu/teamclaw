/**
 * Cron Service
 * 后台管理平台 - 定时任务调度服务
 */

import { CronJob, CronRun, CreateCronJobRequest, UpdateCronJobRequest } from '../models/cronJob.js';
import * as cron from 'node-cron';
import { getFeishuConfig, sendFeishuMessage } from './feishuService.js';
import { llmAutoRoute, type LLMMessages } from './llmService.js';
import { dispatchToAgent } from './agentExecution.js';
import { AgentName } from '../constants/agents.js';
import { cronRepo } from '../db/repositories/cronRepo.js';

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
   * 从 DB 加载已有的定时任务到内存
   */
  async loadFromDb(): Promise<void> {
    try {
      const rows = await cronRepo.findAllJobs();
      for (const row of rows) {
        const job: CronJob = {
          id: row.id,
          name: row.name,
          cron: row.cron,
          prompt: row.prompt,
          status: row.status as CronJob['status'],
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
          createdBy: row.created_by,
          lastRunAt: row.last_run_at?.toISOString(),
          lastRunStatus: row.last_run_status as CronJob['lastRunStatus'],
          lastRunOutput: row.last_run_output ?? undefined,
          lastRunError: row.last_run_error ?? undefined,
          nextRunAt: row.next_run_at?.toISOString(),
          runCount: row.run_count,
          successCount: row.success_count,
          failCount: row.fail_count,
          enabled: row.enabled,
        };
        cronJobs.set(job.id, job);
        cronRuns.set(job.id, []);
        if (job.enabled && this.validateCronExpression(job.cron)) {
          this.scheduleJob(job);
        }
      }
      console.log(`[cronService] Loaded ${rows.length} cron jobs from PostgreSQL`);
    } catch (err) {
      console.warn(
        '[cronService] Failed to load cron jobs from DB:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

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

    // 持久化到 DB
    await cronRepo
      .upsertJob(job)
      .catch(err => console.error('[cronService] Failed to persist new job:', err));

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
      list: Array.from(cronJobs.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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

    // 持久化到 DB
    await cronRepo
      .upsertJob(job)
      .catch(err => console.error('[cronService] Failed to persist job update:', err));

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
    const deleted = cronJobs.delete(id);
    if (deleted) {
      await cronRepo
        .deleteJob(id)
        .catch(err => console.error('[cronService] Failed to delete job from DB:', err));
    }
    return deleted;
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
    await cronRepo
      .upsertJob(job)
      .catch(err => console.error('[cronService] Failed to persist job start:', err));
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
    await cronRepo
      .upsertJob(job)
      .catch(err => console.error('[cronService] Failed to persist job stop:', err));
    return job;
  }

  /**
   * 获取运行记录
   */
  async getRuns(id: string, limit = 20): Promise<CronRun[]> {
    try {
      const rows = await cronRepo.findRunsByJobId(id, limit);
      return rows.map(r => ({
        id: r.id,
        cronJobId: r.cron_job_id,
        startTime: r.start_time.toISOString(),
        endTime: r.end_time?.toISOString(),
        status: r.status as CronRun['status'],
        output: r.output ?? undefined,
        error: r.error ?? undefined,
        durationMs: r.duration_ms ?? undefined,
      }));
    } catch (err) {
      console.warn(
        '[cronService] DB read failed for runs, falling back to memory:',
        err instanceof Error ? err.message : String(err)
      );
      const runs = cronRuns.get(id) || [];
      return runs.slice(-limit).reverse();
    }
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

    // 持久化 run 到 DB
    await cronRepo
      .insertRun(run)
      .catch(err => console.error('[cronService] Failed to persist cron run:', err));

    // 实际发送到飞书群聊
    this.executeAndSend(job, run).catch(err => {
      console.error(`[cronService] trigger error for job ${id}:`, err);
    });

    return run;
  }

  private async executeAndSend(job: CronJob, run: CronRun): Promise<void> {
    let success = false;
    let output: string | undefined;
    let errorMsg: string | undefined;

    try {
      const feishuConfig = getFeishuConfig();
      if (!feishuConfig?.chatId) {
        console.log(
          `[cronService] Feishu not configured, would execute cron job ${job.id}: ${job.prompt}`
        );
        output = `Cron Job "${job.name}" 触发（飞书未配置，仅记录日志）`;
        success = true;
      } else {
        // 检测 prompt 是否含 @agent
        const agentPattern = /@(\w+)/i;
        const agentMatch = job.prompt.match(agentPattern);
        const mentionedAgent = agentMatch?.[1]?.toLowerCase() as AgentName | null;

        let responseText: string;

        if (mentionedAgent && ['main', 'pm', 'coder', 'reviewer'].includes(mentionedAgent)) {
          // @agent → 走 Agent 执行流程
          console.log(
            `[cronService] Cron job ${job.id} routing to agent ${mentionedAgent}: ${job.prompt.slice(0, 80)}...`
          );
          const dispatchResult = dispatchToAgent({
            dispatcher: 'system',
            targetAgent: mentionedAgent,
            taskId: `cron_${job.id}`,
            prompt: job.prompt,
          });

          if ('error' in dispatchResult) {
            responseText = `[Cron] ${job.name}\n\n⚠️ Agent ${mentionedAgent} 执行失败: ${dispatchResult.error}`;
          } else {
            // Agent 异步执行，等待一小段时间后取结果
            responseText = `[Cron] ${job.name}\n\n✅ 任务已派发给 @${mentionedAgent}（executionId: ${dispatchResult.executionId}）`;
          }
        } else {
          // 无 @agent → 直接 LLM 调用
          console.log(
            `[cronService] Cron job ${job.id} calling LLM directly: ${job.prompt.slice(0, 80)}...`
          );
          const messages: LLMMessages[] = [{ role: 'user', content: job.prompt }];
          const llmResponse = await llmAutoRoute(messages);
          responseText = `[Cron] ${job.name}\n\n${llmResponse.content}`;
        }

        // 发送结果到飞书群聊
        const result = await sendFeishuMessage({
          appId: feishuConfig.appId,
          appSecret: feishuConfig.appSecret,
          receiveIdType: 'chat_id',
          receiveId: feishuConfig.chatId,
          msgType: 'text',
          content: JSON.stringify({ text: responseText }),
        });
        output = `Cron 执行完成，消息已发送 (messageId: ${result.messageId})`;
        success = true;
        console.log(
          `[cronService] Cron job ${job.id} executed and sent to Feishu: ${result.messageId}`
        );
      }
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[cronService] Failed to execute cron job ${job.id}:`, err);
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

      // 持久化 job stats 到 DB
      await cronRepo
        .upsertJob(cronJob)
        .catch(err => console.error('[cronService] Failed to persist job stats:', err));
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

// Load cron jobs from DB on startup (non-blocking)
cronService.loadFromDb().catch(err => console.warn('[cronService] Startup load error:', err));

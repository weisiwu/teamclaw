/**
 * Import Orchestrator — PostgreSQL 持久化
 * 项目导入流程管理
 */

import { ImportTask, ImportStep } from '../models/project.js';
import { importRepo } from '../db/repositories/importRepo.js';

export type ImportStepName =
  | 'scan'
  | 'detectTech'
  | 'parseDocs'
  | 'analyzeCode'
  | 'buildSummary'
  | 'generateSkills'
  | 'vectorize'
  | 'done';

export const ALL_STEPS: ImportStepName[] = [
  'scan',
  'detectTech',
  'parseDocs',
  'analyzeCode',
  'buildSummary',
  'generateSkills',
  'vectorize',
  'done',
];

const STEP_NAMES: Record<ImportStepName, string> = {
  scan: '扫描文件结构',
  detectTech: '检测技术栈',
  parseDocs: '解析文档',
  analyzeCode: '分析代码结构',
  buildSummary: '生成项目摘要',
  generateSkills: '生成 Skills',
  vectorize: '向量化存储',
  done: '完成',
};

// In-memory cache (taskId -> ImportTask)
const tasks = new Map<string, ImportTask>();

/**
 * Load tasks from DB on module init
 */
async function loadFromDb(): Promise<void> {
  try {
    const rows = await importRepo.findPending();
    for (const row of rows) {
      const task: ImportTask = {
        taskId: row.task_id,
        projectId: row.project_id,
        status: row.status as ImportTask['status'],
        currentStep: row.current_step,
        totalSteps: row.total_steps ?? 8,
        steps: row.steps as ImportStep[] ?? [],
        startedAt: new Date(row.started_at).toISOString(),
        completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
      };
      tasks.set(task.taskId, task);
    }
    console.log(`[importOrchestrator] Loaded ${rows.length} pending import tasks from PostgreSQL`);
  } catch (err) {
    console.warn('[importOrchestrator] Could not load from DB:', err);
  }
}

// Load on startup (non-blocking)
loadFromDb().catch(err => console.warn('[importOrchestrator] Startup load error:', err));

export function createImportTask(projectId: string): ImportTask {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const steps: ImportStep[] = ALL_STEPS.map((name, i) => ({
    step: i + 1,
    name,
    status: 'pending',
  }));

  const task: ImportTask = {
    taskId,
    projectId,
    status: 'pending',
    currentStep: 0,
    totalSteps: steps.length,
    steps,
    startedAt: new Date().toISOString(),
  };

  tasks.set(taskId, task);
  // Persist to DB
  importRepo.upsert({
    taskId: task.taskId,
    projectId: task.projectId,
    status: task.status,
    currentStep: task.currentStep,
    totalSteps: task.totalSteps,
    steps: task.steps,
    startedAt: task.startedAt,
  }).catch(err => console.error('[importOrchestrator] Failed to persist createImportTask:', err));

  return task;
}

export function executeStep(taskId: string, stepIndex: number): ImportTask {
  const task = tasks.get(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  task.status = 'processing';
  task.currentStep = stepIndex + 1;

  // Mark current and prior steps
  task.steps.forEach((s, i) => {
    if (i < stepIndex) s.status = 'done';
    if (i === stepIndex) s.status = 'running';
  });

  tasks.set(taskId, task);
  importRepo.upsert({
    taskId: task.taskId,
    projectId: task.projectId,
    status: task.status,
    currentStep: task.currentStep,
    steps: task.steps,
  }).catch(err => console.error('[importOrchestrator] Failed to persist executeStep:', err));

  return task;
}

export function completeStep(taskId: string, stepIndex: number, errorMsg?: string): ImportTask {
  const task = tasks.get(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const step = task.steps[stepIndex];
  if (errorMsg) {
    step.status = 'error';
    step.error = errorMsg;
    task.status = 'error';
  } else {
    step.status = 'done';
    task.currentStep = stepIndex + 1;
  }

  // Mark done if last step
  if (stepIndex === task.steps.length - 1) {
    task.status = errorMsg ? 'error' : 'done';
    task.completedAt = new Date().toISOString();
  }

  tasks.set(taskId, task);
  importRepo.upsert({
    taskId: task.taskId,
    projectId: task.projectId,
    status: task.status,
    currentStep: task.currentStep,
    steps: task.steps,
    completedAt: task.completedAt,
    errorMessage: errorMsg,
  }).catch(err => console.error('[importOrchestrator] Failed to persist completeStep:', err));

  return task;
}

export function getTaskStatus(taskId: string): ImportTask | undefined {
  return tasks.get(taskId);
}

export function stepDisplayName(step: ImportStepName): string {
  return STEP_NAMES[step] ?? step;
}

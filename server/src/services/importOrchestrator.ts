/**
 * Import Orchestrator — PostgreSQL 持久化 + 异步流程执行器
 * 项目导入流程管理
 */

import { ImportTask, ImportStep } from '../models/project.js';
import { importRepo } from '../db/repositories/importRepo.js';
import { cloneOrCopyProject } from './gitClone.js';
import { scanDirectory } from './fileScanner.js';
import { detectTechStack } from './techDetector.js';
import { parseDirectory } from './docParser.js';
import { analyzeCodeArchitecture } from './codeAnalyzer.js';
import { detectBuildMechanism } from './buildDetector.js';
import { generateSummary } from './summaryGenerator.js';
import { generateFeatureMap } from './featureMap.js';
import { generateSkills } from './skillGenerator.js';
import { convertDocuments } from './docConverter.js';
import { addDocuments } from './vectorStore.js';
import { analyzeGitHistory } from './gitHistoryAnalysis.js';
import { TechStack } from './techDetector.js';
import { CodeArchitecture } from './codeAnalyzer.js';
import { ParsedDocument } from './docParser.js';
import { ConvertedDoc } from './docConverter.js';
import { BuildMechanism } from './buildDetector.js';
import { ContextCompressor, TextChunk } from './contextCompressor.js';

export type ImportStepName =
  | 'clone'
  | 'scan'
  | 'detectTech'
  | 'parseDocs'
  | 'analyzeCode'
  | 'detectBuild'
  | 'compress'
  | 'buildSummary'
  | 'generateFeatureMap'
  | 'generateSkills'
  | 'convertDocs'
  | 'vectorize'
  | 'gitHistory'
  | 'done';

export const ALL_STEPS: ImportStepName[] = [
  'clone',
  'scan',
  'detectTech',
  'parseDocs',
  'analyzeCode',
  'detectBuild',
  'compress',
  'buildSummary',
  'generateFeatureMap',
  'generateSkills',
  'convertDocs',
  'vectorize',
  'gitHistory',
  'done',
];

const STEP_NAMES: Record<ImportStepName, string> = {
  clone: '克隆/定位项目',
  scan: '扫描文件结构',
  detectTech: '检测技术栈',
  parseDocs: '解析文档',
  analyzeCode: '分析代码结构',
  detectBuild: '检测打包机制',
  compress: '上下文压缩',
  buildSummary: '生成项目摘要',
  generateFeatureMap: '生成功能定位',
  generateSkills: '生成 Skills',
  convertDocs: '文档转换',
  vectorize: '向量化存储',
  gitHistory: 'Git 历史分析',
  done: '完成',
};

export interface ImportContext {
  source: 'url' | 'local';
  url?: string;
  localPath?: string;
  projectPath?: string;
  projectId?: string;
  projectName?: string;
  techStack?: TechStack;
  tree?: { name: string };
  documents?: ParsedDocument[];
  architecture?: CodeArchitecture;
  buildMechanisms?: BuildMechanism[];
  summary?: import('./summaryGenerator.js').ProjectSummary;
  featureMap?: import('./featureMap.js').FeatureMap;
  skills?: import('./skillGenerator.js').GeneratedSkill[];
  convertedDocs?: ConvertedDoc[];
  vectorCollectionName?: string;
  chunks?: TextChunk[];
}

type StepExecutor = (ctx: ImportContext) => Promise<void>;

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
        totalSteps: row.total_steps ?? ALL_STEPS.length,
        steps: Array.isArray(row.steps) ? row.steps.map(s => s as unknown as ImportStep) : [],
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

/**
 * Step executors — each binds a real service call
 */
const STEP_EXECUTORS: Record<ImportStepName, StepExecutor> = {
  clone: async ctx => {
    const projectPath = await cloneOrCopyProject(ctx.source, ctx.url, ctx.localPath);
    ctx.projectPath = projectPath;
    ctx.projectName = ctx.projectName || projectPath.split('/').pop() || 'unknown';
  },

  scan: async ctx => {
    if (!ctx.projectPath) throw new Error('projectPath not set');
    ctx.tree = await scanDirectory(ctx.projectPath);
  },

  detectTech: async ctx => {
    if (!ctx.projectPath) throw new Error('projectPath not set');
    ctx.techStack = await detectTechStack(ctx.projectPath);
  },

  parseDocs: async ctx => {
    if (!ctx.projectPath) throw new Error('projectPath not set');
    ctx.documents = await parseDirectory(ctx.projectPath);
  },

  analyzeCode: async ctx => {
    if (!ctx.projectPath) throw new Error('projectPath not set');
    ctx.architecture = await analyzeCodeArchitecture(ctx.projectPath);
  },

  detectBuild: async ctx => {
    if (!ctx.projectPath) throw new Error('projectPath not set');
    ctx.buildMechanisms = await detectBuildMechanism(ctx.projectPath);
  },

  compress: async ctx => {
    if (!ctx.projectPath || !ctx.documents) throw new Error('projectPath or documents not set');
    const compressor = new ContextCompressor(512, 50);
    const docPaths = (ctx.documents ?? []).map(d => d.path);
    ctx.chunks = await compressor.chunkProject(ctx.projectPath, docPaths);
    console.log(
      `[importOrchestrator] Compressed ${docPaths.length} docs into ${ctx.chunks.length} chunks`
    );
  },

  buildSummary: async ctx => {
    if (!ctx.projectPath || !ctx.techStack) throw new Error('projectPath or techStack not set');
    ctx.summary = await generateSummary(ctx.projectPath, ctx.techStack);
  },

  generateFeatureMap: async ctx => {
    if (!ctx.projectPath || !ctx.projectId || !ctx.projectName) {
      throw new Error('projectPath/projectId/projectName not set');
    }
    ctx.featureMap = await generateFeatureMap(ctx.projectPath, ctx.projectId, ctx.projectName);
  },

  generateSkills: async ctx => {
    if (!ctx.projectName || !ctx.projectPath || !ctx.architecture) {
      throw new Error('projectName/projectPath/architecture not set');
    }
    ctx.skills = await generateSkills(ctx.projectName, ctx.projectPath, ctx.architecture);
  },

  convertDocs: async ctx => {
    if (!ctx.projectPath || !ctx.projectId) throw new Error('projectPath or projectId not set');
    ctx.convertedDocs = await convertDocuments(ctx.projectPath, ctx.projectId);
  },

  vectorize: async ctx => {
    if (!ctx.projectId) throw new Error('projectId not set');
    const collectionName = `proj_${ctx.projectId}`;
    ctx.vectorCollectionName = collectionName;

    // Use compressed chunks if available, otherwise fall back to raw documents
    if (ctx.chunks && ctx.chunks.length > 0) {
      const texts = ctx.chunks.map(c => c.content);
      const ids = ctx.chunks.map(c => c.id);
      const metas = ctx.chunks.map(c => ({
        source: c.source,
        startLine: c.startLine,
        endLine: c.endLine,
        tokenCount: c.tokenCount,
      }));
      await addDocuments(collectionName, texts, ids, metas);
      console.log(
        `[importOrchestrator] Vectorized ${ctx.chunks.length} chunks into ${collectionName}`
      );
    } else if (ctx.documents && ctx.documents.length > 0) {
      const texts = ctx.documents.map(d => d.content);
      const ids = ctx.documents.map((_, i) => `doc_${i}`);
      await addDocuments(collectionName, texts, ids);
    }
  },

  gitHistory: async ctx => {
    if (!ctx.projectPath) throw new Error('projectPath not set');
    // Just run analysis; result is not stored in context but side-effects to DB
    analyzeGitHistory(ctx.projectPath);
  },

  done: async () => {
    // No-op terminal step
  },
};

// Non-critical steps that can fail with warning instead of blocking
const NON_CRITICAL_STEPS: Set<ImportStepName> = new Set([
  'vectorize',
  'generateSkills',
  'generateFeatureMap',
  'convertDocs',
  'gitHistory',
]);

/**
 * Create an import task
 */
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
  importRepo
    .upsert({
      taskId: task.taskId,
      projectId: task.projectId,
      status: task.status,
      currentStep: task.currentStep,
      totalSteps: task.totalSteps,
      steps: task.steps,
      startedAt: task.startedAt,
    })
    .catch(err => console.error('[importOrchestrator] Failed to persist createImportTask:', err));

  return task;
}

/**
 * Execute a specific step (mark as running)
 */
export function executeStep(taskId: string, stepIndex: number): ImportTask {
  const task = tasks.get(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  task.status = 'processing';
  task.currentStep = stepIndex + 1;

  task.steps.forEach((s, i) => {
    if (i < stepIndex) s.status = 'done';
    if (i === stepIndex) s.status = 'running';
  });

  tasks.set(taskId, task);
  importRepo
    .upsert({
      taskId: task.taskId,
      projectId: task.projectId,
      status: task.status,
      currentStep: task.currentStep,
      steps: task.steps,
    })
    .catch(err => console.error('[importOrchestrator] Failed to persist executeStep:', err));

  return task;
}

/**
 * Mark a step as complete (or error)
 */
export function completeStep(
  taskId: string,
  stepIndex: number,
  errorMsg?: string,
  isWarning = false
): ImportTask {
  const task = tasks.get(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const step = task.steps[stepIndex];
  if (errorMsg) {
    if (isWarning) {
      step.status = 'done'; // non-critical failures are marked done with warning
      step.error = `[warning] ${errorMsg}`;
    } else {
      step.status = 'error';
      step.error = errorMsg;
      task.status = 'error';
    }
  } else {
    step.status = 'done';
    task.currentStep = stepIndex + 1;
  }

  if (stepIndex === task.steps.length - 1) {
    task.status = errorMsg && !isWarning ? 'error' : 'done';
    task.completedAt = new Date().toISOString();
  }

  tasks.set(taskId, task);
  importRepo
    .upsert({
      taskId: task.taskId,
      projectId: task.projectId,
      status: task.status,
      currentStep: task.currentStep,
      steps: task.steps,
      completedAt: task.completedAt,
      errorMessage: errorMsg && !isWarning ? errorMsg : undefined,
    })
    .catch(err => console.error('[importOrchestrator] Failed to persist completeStep:', err));

  return task;
}

/**
 * Run all import steps asynchronously
 */
export async function runAllSteps(taskId: string, ctx: ImportContext): Promise<void> {
  for (let i = 0; i < ALL_STEPS.length; i++) {
    const stepName = ALL_STEPS[i];
    try {
      executeStep(taskId, i);
      console.log(`[importOrchestrator] Running step ${i + 1}/${ALL_STEPS.length}: ${stepName}`);
      const executor = STEP_EXECUTORS[stepName];
      if (executor) {
        await executor(ctx);
      }
      completeStep(taskId, i);
      console.log(`[importOrchestrator] Completed step ${i + 1}: ${stepName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isNonCritical = NON_CRITICAL_STEPS.has(stepName);
      console.error(
        `[importOrchestrator] Step ${stepName} failed: ${message}`,
        isNonCritical ? '(non-critical, continuing)' : '(critical, stopping)'
      );
      completeStep(taskId, i, message, isNonCritical);
      if (!isNonCritical) {
        break;
      }
    }
  }
}

export function getTaskStatus(taskId: string): ImportTask | undefined {
  return tasks.get(taskId);
}

export function stepDisplayName(step: ImportStepName): string {
  return STEP_NAMES[step] ?? step;
}

/**
 * Agent 协作流水线编排
 * 实现 main → pm → coder → reviewer → main 的完整协作链路
 */

import { dispatchToAgent, getExecution } from './agentExecution.js';
import {
  startClarificationSession,
  submitClarificationAnswer,
  generateRequirementDoc,
} from './pmProtocol.js';
import { reviewFixLoop } from './reviewLoop.js';
import { parseChanges, applyChanges, commitChanges } from './codeApplicator.js';
import { tryAcquireLock, releaseLock } from './resourceLock.js';
import { getAgent } from './agentService.js';

export type PipelineStageName = 'confirm' | 'clarify' | 'code' | 'review' | 'notify' | 'complete';
export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';

export interface PipelineStage {
  name: PipelineStageName;
  agent: string;
  status: PipelineStatus;
  input?: string;
  output?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface Pipeline {
  pipelineId: string;
  taskId: string;
  originalRequirement: string;
  stages: PipelineStage[];
  currentStageIndex: number;
  status: PipelineStatus;
  pmSessionId?: string;
  codeResult?: string;
  reviewResult?: string;
  createdAt: string;
  updatedAt: string;
}

// 内存存储
const pipelines: Map<string, Pipeline> = new Map();

/**
 * 生成 pipeline ID
 */
function generatePipelineId(): string {
  return generateId('pipeline');
}

/**
 * 选择负载最低的 coder
 */
function selectCoder(): string {
  const coders = ['coder1', 'coder2'];
  let selected = 'coder1';
  let minLoad = Infinity;

  for (const name of coders) {
    const agent = getAgent(name);
    if (agent && agent.loadScore < minLoad) {
      minLoad = agent.loadScore;
      selected = name;
    }
  }

  return selected;
}

/**
 * 创建新流水线
 */
export async function createPipeline(taskId: string, requirement: string): Promise<Pipeline> {
  const pipelineId = generatePipelineId();
  const now = new Date().toISOString();

  const pipeline: Pipeline = {
    pipelineId,
    taskId,
    originalRequirement: requirement,
    stages: [
      { name: 'confirm', agent: 'main', status: 'pending' },
      { name: 'clarify', agent: 'pm', status: 'pending' },
      { name: 'code', agent: '', status: 'pending' }, // agent 待运行时填充
      { name: 'review', agent: 'reviewer', status: 'pending' },
      { name: 'notify', agent: 'main', status: 'pending' },
      { name: 'complete', agent: 'main', status: 'pending' },
    ],
    currentStageIndex: -1,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  pipelines.set(pipelineId, pipeline);
  return pipeline;
}

/**
 * 启动完整协作流水线
 */
export async function executePipeline(pipelineId: string): Promise<Pipeline> {
  const pipeline = pipelines.get(pipelineId);
  if (!pipeline) {
    throw new Error(`Pipeline ${pipelineId} not found`);
  }

  try {
    // ========== Stage 1: main 确认需求 ==========
    await runPipelineStage(pipeline, 0);
    if (pipeline.stages[0].status === 'failed') throw new Error('main confirm stage failed');

    // ========== Stage 2: pm 细化需求 ==========
    await runPipelineStage(pipeline, 1);
    if (pipeline.stages[1].status === 'failed') throw new Error('pm clarify stage failed');

    // ========== Stage 3: coder 执行编码 ==========
    const coder = selectCoder();
    pipeline.stages[2].agent = coder;
    await runPipelineStage(pipeline, 2);
    if (pipeline.stages[2].status === 'failed') throw new Error('coder stage failed');

    // ========== Stage 4: reviewer 审查 ==========
    await runPipelineStage(pipeline, 3);

    // ========== Stage 5: 审查循环（如需要） ==========
    if (pipeline.stages[3].status === 'completed') {
      const reviewApproved = checkIfApproved(pipeline.stages[3].output || '');
      if (!reviewApproved) {
        console.log(`[pipeline] Review issues found, starting fix loop`);
        const fixResult = await reviewFixLoop(pipeline.taskId, pipeline.codeResult || '', 3);
        pipeline.reviewResult = JSON.stringify(fixResult.finalResult);

        if (!fixResult.finalResult.approved) {
          pipeline.stages[3].status = 'failed';
          pipeline.status = 'failed';
          pipeline.updatedAt = new Date().toISOString();
          return pipeline;
        }
      }
    }

    // ========== Stage 5: main 通知完成 ==========
    pipeline.currentStageIndex = 4;
    await runPipelineStage(pipeline, 4);

    // ========== Stage 6: complete ==========
    pipeline.currentStageIndex = 5;
    pipeline.stages[5].status = 'completed';
    pipeline.stages[5].completedAt = new Date().toISOString();

    pipeline.status = 'completed';
    pipeline.updatedAt = new Date().toISOString();
  } catch (err) {
    pipeline.status = 'failed';
    const currentStage = pipeline.stages[pipeline.currentStageIndex];
    if (currentStage) {
      currentStage.status = 'failed';
      currentStage.error = String(err);
    }
    pipeline.updatedAt = new Date().toISOString();
  }

  return pipeline;
}

/**
 * 运行指定的流水线阶段
 */
async function runPipelineStage(pipeline: Pipeline, stageIndex: number): Promise<void> {
  const stage = pipeline.stages[stageIndex];
  pipeline.currentStageIndex = stageIndex;
  stage.status = 'running';
  stage.startedAt = new Date().toISOString();
  pipeline.updatedAt = new Date().toISOString();

  try {
    switch (stage.name) {
      case 'confirm': {
        // main Agent 确认需求
        const result = await runAgentLLM('main', pipeline.originalRequirement);
        stage.output = result;
        stage.status = 'completed';
        break;
      }

      case 'clarify': {
        // pm Agent 澄清问题
        const session = await startClarificationSession(
          pipeline.taskId,
          pipeline.originalRequirement
        );
        pipeline.pmSessionId = session.sessionId;

        if (session.status === 'waiting') {
          // 有澄清问题，需要用户回答，流水线暂停
          stage.output = JSON.stringify(session.questions);
          stage.status = 'blocked';
          pipeline.status = 'blocked';
        } else {
          // 无需澄清或已澄清完毕，直接生成需求文档
          const reqDoc = await generateRequirementDoc(session.sessionId);
          stage.output = reqDoc;
          stage.status = 'completed';
        }
        break;
      }

      case 'code': {
        // coder Agent 执行编码
        const requirementDoc = pipeline.stages[1].output || pipeline.originalRequirement;
        const result = await runAgentLLM(stage.agent, requirementDoc);
        pipeline.codeResult = result;
        stage.output = result;
        stage.status = 'completed';

        // 解析并应用代码变更
        const changes = parseChanges(result);
        if (changes.length > 0) {
          const projectPath = getAgentWorkspacePath(stage.agent);
          const lockResource = 'workspace' as const;
          if (tryAcquireLock(lockResource, stage.agent)) {
            try {
              const applyResult = await applyChanges(projectPath, changes);
              console.log(
                `[pipeline] Applied ${applyResult.applied.length} files, ${applyResult.failed.length} failed`
              );
              if (applyResult.applied.length > 0) {
                await commitChanges(
                  projectPath,
                  `feat: apply code changes from ${stage.agent}\n\nGenerated by agent pipeline ${pipeline.pipelineId}`
                );
              }
            } finally {
              releaseLock(lockResource);
            }
          }
        }
        break;
      }

      case 'review': {
        // reviewer Agent 审查代码
        const codeResult = pipeline.codeResult || '';
        const result = await runAgentLLM('reviewer', codeResult);
        pipeline.reviewResult = result;
        stage.output = result;
        stage.status = 'completed';
        break;
      }

      case 'notify': {
        // main Agent 通知完成
        const summary = `Pipeline completed.\nCode: ${pipeline.stages[2].agent}\nReview: ${pipeline.reviewResult?.slice(0, 200) || 'N/A'}`;
        stage.output = summary;
        stage.status = 'completed';
        break;
      }
    }
  } catch (err) {
    stage.status = 'failed';
    stage.error = String(err);
    throw err;
  }

  stage.completedAt = new Date().toISOString();
  pipeline.updatedAt = new Date().toISOString();
}

/**
 * 运行 Agent 的 LLM 调用（封装 dispatchToAgent 并等待结果）
 */
async function runAgentLLM(agentName: string, prompt: string): Promise<string> {
  const context = dispatchToAgent({
    dispatcher: 'pipeline',
    targetAgent: agentName,
    taskId: `pipeline_${Date.now()}`,
    prompt,
    timeoutMs: 5 * 60 * 1000,
  });

  if ('error' in context) {
    throw new Error(`Dispatch failed: ${context.error}`);
  }

  // 等待执行完成（轮询，最长 5 分钟）
  const startTime = Date.now();
  while (Date.now() - startTime < 5 * 60 * 1000) {
    const exec = getExecution(context.executionId);
    if (exec) {
      if (exec.status === 'completed') return exec.result || '';
      if (exec.status === 'failed' || exec.status === 'timeout') {
        throw new Error(`Agent ${agentName} execution failed: ${exec.error}`);
      }
    }
    await sleep(500);
  }

  throw new Error(`Agent ${agentName} execution timeout`);
}

/**
 * 获取 Agent 工作目录
 */
function getAgentWorkspacePath(agentName: string): string {
  const agent = getAgent(agentName);
  return agent?.workspace || `~/.openclaw/workspace/${agentName}`;
}

/**
 * 检查 reviewer 输出是否表示通过
 */
function checkIfApproved(reviewOutput: string): boolean {
  try {
    const jsonMatch = reviewOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.approved === true;
    }
  } catch {
    // 解析失败
  }
  // 默认不通过
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取流水线状态
 */
export function getPipeline(pipelineId: string): Pipeline | undefined {
  return pipelines.get(pipelineId);
}

/**
 * 获取任务关联的所有流水线
 */
export function getPipelinesByTask(taskId: string): Pipeline[] {
  return Array.from(pipelines.values()).filter(p => p.taskId === taskId);
}

/**
 * 提交 PM 澄清问题的回答（外部 API 回调）
 */
export async function submitPMAnswer(
  pipelineId: string,
  questionIndex: number,
  answer: string
): Promise<{ remaining: number; isComplete: boolean }> {
  const pipeline = pipelines.get(pipelineId);
  if (!pipeline || !pipeline.pmSessionId) {
    throw new Error(`Pipeline ${pipelineId} has no active PM session`);
  }

  const result = await submitClarificationAnswer(pipeline.pmSessionId, questionIndex, answer);

  // 如果回答完毕，继续执行流水线
  if (result.isComplete) {
    const reqDoc = await generateRequirementDoc(pipeline.pmSessionId);
    pipeline.stages[1].output = reqDoc;
    pipeline.stages[1].status = 'completed';
    pipeline.stages[1].completedAt = new Date().toISOString();

    // 继续执行后续阶段
    executePipeline(pipelineId).catch(err => {
      console.error('[pipeline] Resume after PM answer failed:', err);
    });
  }

  return result;
}

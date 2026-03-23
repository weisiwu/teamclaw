/**
 * PM 交互协议 - 结构化问答 + 需求文档生成
 * 实现 pm Agent 的澄清问题流程和需求文档自动生成
 */

import { buildSystemPrompt, getUserPromptPrefix } from '../prompts/agentPrompts.js';
import { llmAutoRoute } from './llmService.js';

export interface ClarificationQuestion {
  index: number;
  question: string;
  answered: boolean;
  answer?: string;
}

export interface ClarificationSession {
  sessionId: string;
  taskId: string;
  originalRequirement: string;
  questions: ClarificationQuestion[];
  answers: Map<number, string>;
  totalQuestions: number;
  status: 'active' | 'waiting' | 'completed';
  requirementDoc?: string;
  createdAt: string;
  updatedAt: string;
}

const sessions: Map<string, ClarificationSession> = new Map();

/**
 * 生成唯一 sessionId
 */
function generateSessionId(): string {
  return `pm_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 启动 PM 澄清会话
 * 1. PM 分析需求并生成澄清问题（不超过 maxQuestions 个）
 */
export async function startClarificationSession(
  taskId: string,
  requirement: string,
  maxQuestions: number = 3
): Promise<ClarificationSession> {
  const sessionId = generateSessionId();
  const now = new Date().toISOString();

  const session: ClarificationSession = {
    sessionId,
    taskId,
    originalRequirement: requirement,
    questions: [],
    answers: new Map(),
    totalQuestions: maxQuestions,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  // 调用 LLM 让 PM 生成澄清问题
  const systemPrompt = buildSystemPrompt('pm', {});
  const userPrompt = `${getUserPromptPrefix('pm')}
原始需求：${requirement}

请分析上述需求，提出不超过 ${maxQuestions} 个关键的澄清问题。
回复格式严格为 JSON 数组，每项包含 index（序号）和 question（问题文本）：
[{"index": 1, "question": "问题1"}, {"index": 2, "question": "问题2"}, ...]`;

  try {
    const response = await llmAutoRoute([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // 解析 LLM 返回的 JSON 问题列表
    const content = response.content.trim();
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      session.questions = parsed.map((q: { index: number; question: string }) => ({
        index: q.index,
        question: q.question,
        answered: false,
      }));
      session.status = 'waiting';
    } else {
      // fallback：默认空问题列表，直接进入已完成
      session.questions = [];
      session.status = 'completed';
    }
  } catch (err) {
    console.error('[pmProtocol] Failed to generate questions:', err);
    session.questions = [];
    session.status = 'completed';
  }

  sessions.set(sessionId, session);
  return session;
}

/**
 * 提交用户对某个问题的回答
 */
export async function submitClarificationAnswer(
  sessionId: string,
  questionIndex: number,
  answer: string
): Promise<{ remaining: number; isComplete: boolean }> {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`PM Session ${sessionId} not found`);
  }

  if (session.status === 'completed') {
    return { remaining: 0, isComplete: true };
  }

  // 记录回答
  session.answers.set(questionIndex, answer);
  const question = session.questions.find(q => q.index === questionIndex);
  if (question) {
    question.answered = true;
    question.answer = answer;
  }
  session.updatedAt = new Date().toISOString();

  // 检查是否所有问题都已回答
  const answeredCount = session.questions.filter(q => q.answered).length;
  const remaining = session.questions.length - answeredCount;

  if (remaining === 0) {
    session.status = 'completed';
  }

  return { remaining, isComplete: remaining === 0 };
}

/**
 * 生成结构化需求文档（在所有问题回答完毕后调用）
 */
export async function generateRequirementDoc(sessionId: string): Promise<string> {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`PM Session ${sessionId} not found`);
  }

  if (session.status !== 'completed') {
    throw new Error('Session not yet complete, all questions must be answered first');
  }

  // 构建 Q&A 文本
  const qaText = session.questions
    .map(q => `Q${q.index}: ${q.question}\nA${q.index}: ${q.answer || '（未回答）'}`)
    .join('\n\n');

  const systemPrompt = buildSystemPrompt('pm', {});
  const userPrompt = `基于以下澄清问答，生成结构化需求文档：

原始需求：
${session.originalRequirement}

澄清问答：
${qaText}

请生成一份结构化需求文档，包含：
1. 需求概述
2. 功能需求清单（分点描述）
3. 非功能需求（如有）
4. 验收标准

回复格式：JSON 对象：
{
  "title": "需求标题",
  "overview": "需求概述",
  "functional": ["功能点1", "功能点2", ...],
  "nonFunctional": ["非功能需求1", ...],
  "acceptance": ["验收标准1", ...]
}`;

  try {
    const response = await llmAutoRoute([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const content = response.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      session.requirementDoc = jsonMatch[0];
    } else {
      session.requirementDoc = content;
    }
  } catch (err) {
    console.error('[pmProtocol] Failed to generate requirement doc:', err);
    session.requirementDoc = JSON.stringify({
      title: '需求文档',
      overview: session.originalRequirement,
      functional: [],
      nonFunctional: [],
      acceptance: [],
    });
  }

  session.updatedAt = new Date().toISOString();
  return session.requirementDoc;
}

/**
 * 获取 PM 会话状态
 */
export function getClarificationSession(sessionId: string): ClarificationSession | undefined {
  return sessions.get(sessionId);
}

/**
 * 获取任务关联的所有 PM 会话
 */
export function getSessionsByTask(taskId: string): ClarificationSession[] {
  return Array.from(sessions.values()).filter(s => s.taskId === taskId);
}

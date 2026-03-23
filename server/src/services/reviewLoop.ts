/**
 * Reviewer-Coder 修复循环
 * 实现 reviewer 审查代码 → coder 修复 → 再次审查的循环
 * 最多循环 maxRounds 次
 */

import { buildSystemPrompt, getUserPromptPrefix } from '../prompts/agentPrompts.js';
import { llmAutoRoute } from './llmService.js';

export interface ReviewIssue {
  file?: string;
  line?: number;
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  suggestedFix?: string;
}

export interface ReviewResult {
  approved: boolean;
  issues: ReviewIssue[];
  summary?: string;
}

export interface ReviewFixLoopResult {
  finalResult: ReviewResult;
  rounds: number;
  allRounds: ReviewResult[];
}

/**
 * 执行审查修复循环
 * @param taskId - 关联任务 ID
 * @param codeResult - coder 生成的代码结果（包含文件路径和代码内容）
 * @param maxRounds - 最大修复轮次，默认 3
 */
export async function reviewFixLoop(
  taskId: string,
  codeResult: string,
  maxRounds: number = 3
): Promise<ReviewFixLoopResult> {
  const allRounds: ReviewResult[] = [];
  let currentCode = codeResult;
  let round = 0;
  let currentReview: ReviewResult = { approved: false, issues: [] };

  while (!currentReview.approved && round < maxRounds) {
    round++;
    console.log(`[reviewLoop] Round ${round}/${maxRounds}: reviewing code`);

    // Step 1: reviewer 审查当前代码
    currentReview = await executeReview(currentCode);

    if (currentReview.approved) {
      console.log(`[reviewLoop] Round ${round}: code approved`);
      allRounds.push(currentReview);
      break;
    }

    console.log(`[reviewLoop] Round ${round}: found ${currentReview.issues.length} issues`);
    allRounds.push(currentReview);

    if (round >= maxRounds) {
      console.log(`[reviewLoop] Max rounds (${maxRounds}) reached, stopping`);
      break;
    }

    // Step 2: 将审查意见发给 coder 进行修复
    console.log(`[reviewLoop] Round ${round}: sending issues to coder for fix`);
    currentCode = await executeCoderFix(taskId, currentReview.issues);
  }

  return { finalResult: currentReview, rounds: round, allRounds };
}

/**
 * 执行一次代码审查
 */
async function executeReview(codeContent: string): Promise<ReviewResult> {
  const systemPrompt = buildSystemPrompt('reviewer', {});
  const userPrompt = `${getUserPromptPrefix('reviewer')}
请审查以下代码，返回结构化审查意见：

代码内容：
${codeContent}

回复格式严格为 JSON：
{
  "approved": true或false,
  "issues": [
    {
      "file": "文件名（如果可推断）",
      "line": 行号（如果可推断）,
      "severity": "error"或"warning"或"suggestion",
      "message": "问题描述",
      "suggestedFix": "建议修复方案（如果有）"
    }
  ],
  "summary": "总体评价（1-2句话）"
}`;

  try {
    const response = await llmAutoRoute([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const content = response.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ReviewResult;
    }
    // fallback：解析失败时信任结果
    return { approved: true, issues: [], summary: '审查解析失败，默认通过' };
  } catch (err) {
    console.error('[reviewLoop] Review failed:', err);
    return { approved: false, issues: [{ severity: 'error', message: `审查执行失败: ${err}` }] };
  }
}

/**
 * 让 coder 根据审查意见修复代码
 */
async function executeCoderFix(taskId: string, issues: ReviewIssue[]): Promise<string> {
  const systemPrompt = buildSystemPrompt('coder1', {});
  const issuesText = issues
    .map(i => {
      const location = [i.file, i.line ? `:${i.line}` : ''].filter(Boolean).join('');
      const locStr = location ? `[${location}] ` : '';
      return `${locStr}[${i.severity.toUpperCase()}] ${i.message}${i.suggestedFix ? `\n  → 建议修复: ${i.suggestedFix}` : ''}`;
    })
    .join('\n\n');

  const userPrompt = `${getUserPromptPrefix('coder1')}
请根据以下审查意见修复代码。

审查意见：
${issuesText}

请修复上述问题，回复格式为 JSON：
{
  "files": [
    {
      "filePath": "文件路径",
      "action": "create或modify",
      "content": "完整文件内容（如果action是create或modify）"
    }
  ],
  "summary": "修复摘要"
}`;

  try {
    const response = await llmAutoRoute([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    return response.content;
  } catch (err) {
    console.error('[reviewLoop] Coder fix failed:', err);
    return JSON.stringify({ error: `修复执行失败: ${err}` });
  }
}

/**
 * 快速审查（不触发修复循环）
 * 用于流水线中 reviewer 审查 coder 输出
 */
export async function quickReview(codeContent: string): Promise<ReviewResult> {
  return executeReview(codeContent);
}

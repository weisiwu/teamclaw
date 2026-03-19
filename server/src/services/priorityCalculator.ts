/**
 * Priority Calculator 服务
 * 消息机制模块 - 优先级计算引擎
 * 
 * 优先级公式：priority = roleWeight × urgency
 * - 角色权重：admin=10, vice_admin=7, employee=3
 * - 紧急度：普通消息=1, 包含紧急关键词=3
 */

import { Message, ROLE_WEIGHTS, URGENCY_KEYWORDS } from '../models/message.js';

/**
 * 计算单条消息的优先级
 */
export function calculatePriority(role: Message['role'], urgency: number): number {
  const roleWeight = ROLE_WEIGHTS[role] ?? 3;
  return roleWeight * urgency;
}

/**
 * 检测消息内容是否包含紧急关键词
 * @returns 紧急度（1 或 3）
 */
export function detectUrgency(content: string): number {
  const lowerContent = content.toLowerCase();
  for (const keyword of URGENCY_KEYWORDS) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      return 3;
    }
  }
  return 1;
}

/**
 * 构建完整的消息优先级信息
 */
export function enrichMessagePriority(
  role: Message['role'],
  content: string
): { urgency: number; priority: number; roleWeight: number } {
  const urgency = detectUrgency(content);
  const roleWeight = ROLE_WEIGHTS[role] ?? 3;
  const priority = roleWeight * urgency;
  return { urgency, priority, roleWeight };
}

/**
 * 抢占判断：新消息是否应该抢占当前正在执行的任务
 * 规则：新任务优先级 > 当前任务优先级 × 1.5 → 触发抢占
 */
export function shouldPreempt(newPriority: number, currentPriority: number): boolean {
  return newPriority > currentPriority * 1.5;
}

/**
 * 获取优先级等级标签
 */
export function getPriorityLevel(priority: number): 'critical' | 'high' | 'medium' | 'low' {
  if (priority >= 25) return 'critical';
  if (priority >= 15) return 'high';
  if (priority >= 7) return 'medium';
  return 'low';
}

/**
 * 获取优先级的颜色代码（用于前端展示）
 */
export function getPriorityColor(priority: number): string {
  if (priority >= 25) return '#ef4444'; // 红色 - 紧急
  if (priority >= 15) return '#f97316'; // 橙色 - 高
  if (priority >= 7) return '#eab308';  // 黄色 - 中
  return '#22c55e';                      // 绿色 - 低
}

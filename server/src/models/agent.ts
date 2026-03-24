/**
 * Agent 数据模型定义
 */

import { AgentLevel, AgentRole } from "../constants/agents.js";

// ============ Agent 运行时状态 ============
export type AgentStatus = "idle" | "busy" | "error" | "offline";

export interface AgentRuntime {
  name: string;
  status: AgentStatus;
  currentTask: string | null; // 任务ID
  currentTaskStartedAt: string | null; // ISO timestamp
  lastHeartbeat: string | null; // ISO timestamp
  loadScore: number; // 负载评分 0-100，100表示最忙
}

// ============ Agent 详情（配置 + 运行时）===========
export interface AgentDetail extends Record<string, unknown> {
  // 持久化字段
  id?: string;
  // 静态配置
  name: string;
  role: AgentRole;
  level: AgentLevel;
  description: string;
  inGroup: boolean;
  defaultModel: string;
  capabilities: string[];
  workspace: string;
  sessionKey?: string;
  // 持久化状态
  status?: 'active' | 'disabled';
  createdAt?: string;
  updatedAt?: string;
  // 运行时状态
  statusRuntime?: AgentStatus;
  currentTask: string | null;
  currentTaskStartedAt: string | null;
  lastHeartbeat: string | null;
  loadScore: number;
}

// ============ 任务指派请求 ============
export interface DispatchRequest {
  fromAgent: string; // 指派人
  toAgent: string; // 被指派人
  taskId: string; // 任务ID
  taskTitle: string; // 任务标题
  priority: "low" | "normal" | "high" | "urgent";
  deadline?: string; // ISO timestamp
  dependencies?: string[]; // 依赖的任务ID
  description?: string; // 任务描述
}

// ============ 任务指派响应 ============
export interface DispatchResponse {
  success: boolean;
  message: string;
  taskId?: string;
  rejected?: boolean;
  reason?: string;
}

// ============ 团队概览 ============
export interface TeamOverview {
  levels: {
    level: AgentLevel;
    label: string;
    agents: AgentDetail[];
  }[];
  dispatchMatrix: Record<string, string[]>;
}

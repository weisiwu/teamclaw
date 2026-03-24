/**
 * Agent-Token 绑定数据模型
 * 定义 Agent 与 API Token 的绑定规则
 */

export type LLMProvider = 'openai' | 'anthropic' | 'deepseek' | 'custom';
export type ModelTier = 'light' | 'medium' | 'strong';

export interface AgentTokenBinding {
  id: string;
  agentName: string;
  tokenId: string;
  priority: number;               // 1 最高，数字越大优先级越低
  modelFilter?: string[];         // 可选：匹配的模型名称列表
  tierFilter?: ModelTier[];      // 可选：匹配的层级列表
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 数据库表结构映射（snake_case）
export interface AgentTokenBindingRow {
  id: string;
  agent_name: string;
  token_id: string;
  priority: number;
  model_filter: string | null;   // JSON string
  tier_filter: string | null;    // JSON string
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// 创建绑定参数
export interface CreateBindingParams {
  agentName: string;
  tokenId: string;
  priority: number;
  modelFilter?: string[];
  tierFilter?: ModelTier[];
  enabled?: boolean;
}

// 更新绑定参数
export interface UpdateBindingParams {
  tokenId?: string;
  priority?: number;
  modelFilter?: string[];
  tierFilter?: ModelTier[];
  enabled?: boolean;
}

// 绑定概览（用于矩阵视图）
export interface BindingOverview {
  agents: string[];
  tokens: Array<{
    id: string;
    alias: string;
    provider: string;
  }>;
  matrix: Record<string, Record<string, AgentTokenBinding | null>>; // agentName -> tokenId -> binding
}

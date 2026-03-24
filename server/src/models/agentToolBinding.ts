/**
 * Agent-Tool Binding 数据模型
 * Agent 与 Tool 的绑定关系 + 权限控制
 */

export interface AgentToolBinding {
  id: string;
  agentName: string;           // Agent 名称
  toolId: string;              // Tool ID
  enabled: boolean;            // 该 Agent 是否可使用此 Tool
  requiresApproval: boolean;   // 是否覆盖 Tool 默认审批设置
  createdAt: string;
  updatedAt: string;
}

// 数据库表结构映射（snake_case）
export interface AgentToolBindingRow {
  id: string;
  agent_name: string;
  tool_id: string;
  enabled: number;              // SQLite/PG: 0/1
  requires_approval: number;    // SQLite/PG: 0/1
  created_at: string;
  updated_at: string;
}

// 创建绑定参数
export interface CreateAgentToolBindingParams {
  agentName: string;
  toolId: string;
  enabled?: boolean;
  requiresApproval?: boolean;
}

// 更新绑定参数
export interface UpdateAgentToolBindingParams {
  enabled?: boolean;
  requiresApproval?: boolean;
}

// 绑定详情（包含 Tool 信息）
export interface AgentToolBindingDetail extends AgentToolBinding {
  toolName: string;
  toolDisplayName: string;
  toolCategory: string;
  toolRiskLevel: string;
  toolRequiresApproval: boolean;
  toolEnabled: boolean;
}

// 全局矩阵视图行
export interface AgentToolMatrixRow {
  agentName: string;
  agentDisplayName?: string;
  bindings: {
    toolId: string;
    toolName: string;
    toolDisplayName: string;
    toolCategory: string;
    toolRiskLevel: string;
    enabled: boolean;
    requiresApproval: boolean;
  }[];
}

// 默认绑定策略
export type AgentToolDefaultStrategy = 'allow_all' | 'deny_all' | 'by_level';

// Agent 等级对应的工具策略
export const AGENT_LEVEL_TOOL_STRATEGY: Record<number, { maxRiskLevel: 'low' | 'medium' | 'high' }> = {
  3: { maxRiskLevel: 'high' },   // Lv3: 全部可用
  2: { maxRiskLevel: 'medium' }, // Lv2: 中低风险
  1: { maxRiskLevel: 'low' },     // Lv1: 低风险
};

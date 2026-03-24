/**
 * Agent Token Binding 数据模型
 * Agent 与 API Token 的绑定关系
 */

export interface AgentTokenBinding {
  id: string;
  agentName: string;             // Agent 英文名称（如：architect）
  tokenId: string;               // 关联的 ApiToken ID
  priority: number;              // 优先级，1 最高，数字越小优先级越高
  modelFilter?: string[];        // 模型过滤（如：['gpt-4', 'claude-sonnet']）
  tierFilter?: ('light' | 'medium' | 'strong')[];  // 模型层级过滤
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
  model_filter: string | null;   // JSON array
  tier_filter: string | null;    // JSON array
  enabled: number;               // SQLite: 0/1
  created_at: string;
  updated_at: string;
}

// 创建绑定参数
export interface CreateAgentTokenBindingParams {
  agentName: string;
  tokenId: string;
  priority?: number;
  modelFilter?: string[];
  tierFilter?: ('light' | 'medium' | 'strong')[];
}

// 更新绑定参数
export interface UpdateAgentTokenBindingParams {
  priority?: number;
  modelFilter?: string[];
  tierFilter?: ('light' | 'medium' | 'strong')[];
  enabled?: boolean;
}

// 绑定详情（包含 Token 和 Agent 信息）
export interface AgentTokenBindingDetail extends AgentTokenBinding {
  tokenAlias: string;
  tokenProvider: string;
  tokenStatus: string;
  agentDisplayName?: string;
}

// 调度查询结果
export interface ResolvedToken {
  bindingId: string;
  tokenId: string;
  apiKey: string;                // 解密后的 API Key
  provider: string;
  baseUrl?: string;
  models: string[];
  priority: number;
}

// 绑定概览矩阵行
export interface BindingOverviewRow {
  agentName: string;
  agentDisplayName?: string;
  bindings: {
    bindingId: string;
    tokenAlias: string;
    tokenProvider: string;
    priority: number;
    tierFilter?: ('light' | 'medium' | 'strong')[];
    enabled: boolean;
  }[];
}

// 调度上下文
export interface TokenResolutionContext {
  agentName: string;
  tier: 'light' | 'medium' | 'strong';
  preferredModel?: string;
}

/**
 * TokenStats 模型定义
 * 后台管理平台 - Token 消费统计数据模型
 */

export type TokenLayer = 'light' | 'medium' | 'strong';

export interface TokenUsageRecord {
  id: string;
  taskId?: string;          // 关联的任务ID（可选）
  layer: TokenLayer;       // 模型层级
  inputTokens: number;     // 输入 token 数
  outputTokens: number;    // 输出 token 数
  totalTokens: number;     // 总 token 数
  cost: number;            // 预估成本(元)
  timestamp: string;        // 记录时间
  model?: string;          // 实际使用的模型名称
}

export interface TokenDailyStats {
  date: string;            // 日期，格式: YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface TokenLayerStats {
  layer: TokenLayer;
  tokens: number;
  cost: number;
  percent: number;
}

export interface TokenTaskStats {
  taskId: string;
  tokens: number;
}

export interface TokenSummary {
  totalTokens: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  byLayer: TokenLayerStats[];
}

export interface TokenTrendPoint {
  date: string;
  tokens: number;
  cost: number;
}

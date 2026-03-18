/**
 * 模型分级配置
 * TeamClaw 系统架构 V1 - Layer1/Layer2/Layer3 模型分发策略
 */

export type ModelTier = 'light' | 'medium' | 'strong';

export interface ModelConfig {
  name: string;
  apiKeyEnv: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export const modelTiers: Record<ModelTier, ModelConfig> = {
  light: {
    name: process.env.LIGHT_MODEL || 'deepseek-chat',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    maxTokens: 4096,
    temperature: 0.7,
  },
  medium: {
    name: process.env.MEDIUM_MODEL || 'gpt-4o-mini',
    apiKeyEnv: 'OPENAI_API_KEY',
    baseUrl: process.env.OPENAI_BASE_URL,
    maxTokens: 16384,
    temperature: 0.5,
  },
  strong: {
    name: process.env.STRONG_MODEL || 'claude-sonnet-4-20250514',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    maxTokens: 81920,
    temperature: 0.3,
  },
};

export function getModelConfig(tier: ModelTier): ModelConfig {
  return modelTiers[tier];
}

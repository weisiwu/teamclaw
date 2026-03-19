/**
 * SystemConfig 模型定义
 * 后台管理平台 - 系统配置数据模型
 */

export interface LLMConfig {
  defaultModel: string;    // 默认模型名称
  temperature: number;      // 0-2
  maxTokens: number;       // 最大输出 token 数
}

export interface FeatureFlags {
  fileUpload: boolean;     // 文件上传功能
  webhook: boolean;        // Webhook 功能
  autoBackup: boolean;     // 自动备份
  aiSummary: boolean;      // AI 摘要生成
}

export interface SecurityConfig {
  allowedIpRanges: string[];              // 允许的 IP 范围
  requireApprovalForDelete: boolean;       // 删除操作是否需要审批
  sessionTimeoutMinutes: number;           // Session 超时分钟数
}

export interface SystemConfig {
  id: string;             // 固定值: 'system'
  llm: LLMConfig;
  features: FeatureFlags;
  security: SecurityConfig;
  updatedAt: string;       // ISO 8601
  updatedBy: string;       // 操作者
}

// 默认配置
export const DEFAULT_SYSTEM_CONFIG: Omit<SystemConfig, 'id' | 'updatedAt' | 'updatedBy'> = {
  llm: {
    defaultModel: 'claude-3-5-sonnet',
    temperature: 0.7,
    maxTokens: 4096,
  },
  features: {
    fileUpload: true,
    webhook: true,
    autoBackup: false,
    aiSummary: true,
  },
  security: {
    allowedIpRanges: [],
    requireApprovalForDelete: false,
    sessionTimeoutMinutes: 60,
  },
};

export interface UpdateConfigRequest {
  llm?: Partial<LLMConfig>;
  features?: Partial<FeatureFlags>;
  security?: Partial<SecurityConfig>;
}

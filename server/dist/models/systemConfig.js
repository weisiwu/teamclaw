/**
 * SystemConfig 模型定义
 * 后台管理平台 - 系统配置数据模型
 */
// 默认配置
export const DEFAULT_SYSTEM_CONFIG = {
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

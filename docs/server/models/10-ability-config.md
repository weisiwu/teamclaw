# 能力与配置模型

> 来源文件：`server/src/models/ability.ts`, `server/src/models/systemConfig.ts`, `server/src/constants/roles.ts`

## Ability 模型

能力/权限定义。

```typescript
export interface Ability {
  id: string; // 能力 ID
  name: string; // 能力名称
  description: string; // 能力描述
  enabled: boolean; // 是否启用
  requiredRole: 'all' | 'admin' | 'sub_admin'; // 所需角色
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface AbilityToggleRequest {
  abilityId: string;
  enabled: boolean;
}
```

### 默认能力列表

```typescript
export const DEFAULT_ABILITIES: Omit<Ability, 'createdAt' | 'updatedAt'>[] = [
  { id: 'view_docs', name: '查看项目文档库', enabled: true, requiredRole: 'all' },
  { id: 'view_project', name: '查看项目详情', enabled: true, requiredRole: 'all' },
  { id: 'view_tasks', name: '查看任务列表', enabled: true, requiredRole: 'all' },
  { id: 'view_artifacts', name: '查看产物列表', enabled: true, requiredRole: 'all' },
  { id: 'download_file', name: '下载文件', enabled: true, requiredRole: 'all' },
  { id: 'admin_config', name: '后台配置操作', enabled: true, requiredRole: 'admin' },
];
```

### Ability.requiredRole 角色要求

| 值          | 说明             |
| ----------- | ---------------- |
| `all`       | 所有用户可用     |
| `admin`     | 仅管理员         |
| `sub_admin` | 管理员和副管理员 |

## SystemConfig 模型

系统配置。

```typescript
export interface LLMConfig {
  defaultModel: string; // 默认模型名称
  temperature: number; // 0-2
  maxTokens: number; // 最大输出 token 数
}

export interface FeatureFlags {
  fileUpload: boolean; // 文件上传功能
  webhook: boolean; // Webhook 功能
  autoBackup: boolean; // 自动备份
  aiSummary: boolean; // AI 摘要生成
}

export interface SecurityConfig {
  allowedIpRanges: string[]; // 允许的 IP 范围
  requireApprovalForDelete: boolean; // 删除操作是否需要审批
  sessionTimeoutMinutes: number; // Session 超时分钟数
}

export interface SystemConfig {
  id: string; // 固定值: 'system'
  llm: LLMConfig;
  features: FeatureFlags;
  security: SecurityConfig;
  updatedAt: string; // ISO 8601
  updatedBy: string; // 操作者
}
```

### 默认配置

```typescript
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
```

### UpdateConfigRequest

```typescript
export interface UpdateConfigRequest {
  llm?: Partial<LLMConfig>;
  features?: Partial<FeatureFlags>;
  security?: Partial<SecurityConfig>;
}
```

## 角色与权限模型

> 来源文件：`server/src/constants/roles.ts`

```typescript
export type Role = 'admin' | 'vice_admin' | 'member';

export const ROLE_LABELS: Record<Role, string> = {
  admin: '管理员',
  vice_admin: '副管理员',
  member: '普通员工',
};

export const ROLE_WEIGHTS: Record<Role, number> = {
  admin: 10,
  vice_admin: 7,
  member: 3,
};
```

### 角色体系

| 角色         | 标签     | 权重 |
| ------------ | -------- | ---- |
| `admin`      | 管理员   | 10   |
| `vice_admin` | 副管理员 | 7    |
| `member`     | 普通员工 | 3    |

### Agent 访问矩阵

```typescript
export type AgentName = 'main' | 'pm' | 'coder' | 'reviewer';

export const AGENT_ACCESS_MATRIX: Record<Role, AgentName[]> = {
  admin: ['main', 'pm', 'coder', 'reviewer'],
  vice_admin: ['main', 'pm'],
  member: ['pm'],
};
```

### 权限检查函数

```typescript
// 检查用户是否有权限与指定 Agent 交互
function canAccessAgent(role: Role, agent: AgentName): boolean;

// 获取用户与 pm 交互时的能力范围
function getPmCapability(role: Role): 'full' | 'assistant_only';

// 比较两个角色的权重
function compareRoleWeight(roleA: Role, roleB: Role): number;

// 获取优先级更高的角色
function getHigherRole(role: Role): Role | null;
```

## ModelConfig 模型

AI 模型配置。

```typescript
export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'azure' | 'custom';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}
```

### 预配置模型

```typescript
// 中等模型：用于摘要生成和代码分析
export const mediumModel: ModelConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  maxTokens: 2000,
  temperature: 0.3,
};

// 嵌入模型：用于向量存储
export const embeddingModel: ModelConfig = {
  provider: 'openai',
  model: 'text-embedding-3-small',
  maxTokens: 1000,
  temperature: 0,
};

// 轻量模型：用于快速分类
export const lightModel: ModelConfig = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  maxTokens: 500,
  temperature: 0.1,
};
```

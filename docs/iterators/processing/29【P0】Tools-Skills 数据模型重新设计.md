# 29【P0】Tools/Skills 数据模型重新设计

## 背景

当前 `Ability` 模型过于简单，仅包含 id/name/description/enabled/requiredRole 5 个字段，实际只是页面级权限开关（如"查看项目详情"、"下载文件"），与智能体系统的 Tools/Skills 完全无关。

同时，后端已有 `skillGenerator.ts` 可以自动生成 Skills（构建指南、代码结构、部署流程、测试规范），存储在 `~/.openclaw/skills/` 目录，但这些 Skills 未被纳入任何管理体系，前端也无法查看。

## 目标

重新设计数据模型，将辅助能力管理页改造为 **智能体 Tools & Skills 管理中心**。

## 概念定义

| 概念 | 说明 | 示例 |
|------|------|------|
| **Tool** | Agent 可调用的外部工具/API，有明确的输入参数和输出格式 | Git 操作、文件读写、Shell 执行、API 调用 |
| **Skill** | Agent 可参考的知识/流程文档（Markdown），注入到 system prompt 中 | 构建指南、代码规范、部署流程、项目结构说明 |

## 数据模型

### Tool 模型

```typescript
// server/src/models/tool.ts

export type ToolCategory = 'file' | 'git' | 'shell' | 'api' | 'browser' | 'custom';
export type ToolSource = 'builtin' | 'user' | 'imported';

export interface ToolDefinition {
  id: string;                        // 唯一 ID
  name: string;                      // 工具名称，如 "file_read"
  displayName: string;               // 显示名，如 "文件读取"
  description: string;               // 功能描述
  category: ToolCategory;            // 分类
  source: ToolSource;                // 来源：内置 / 用户创建 / 导入
  enabled: boolean;                  // 是否全局启用
  parameters: ToolParameter[];       // 输入参数定义
  outputSchema?: string;             // 输出格式描述
  riskLevel: 'low' | 'medium' | 'high'; // 风险等级
  requiresApproval: boolean;         // 是否需要人工审批才能执行
  version: string;                   // 版本号
  createdAt: string;
  updatedAt: string;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: unknown;
}
```

### Skill 模型

```typescript
// server/src/models/skill.ts

export type SkillCategory = 'build' | 'deploy' | 'test' | 'structure' | 'coding' | 'review' | 'custom';
export type SkillSource = 'generated' | 'user' | 'imported';

export interface SkillDefinition {
  id: string;                        // 唯一 ID
  name: string;                      // 技能名称
  displayName: string;               // 显示名
  description: string;               // 简述
  category: SkillCategory;           // 分类
  source: SkillSource;               // 来源
  content: string;                   // Skill 内容（Markdown）
  filePath?: string;                 // 磁盘文件路径（来自 skillGenerator 的）
  applicableAgents: string[];        // 适用的 Agent 列表（空=所有）
  enabled: boolean;                  // 是否启用
  tags: string[];                    // 标签
  version: string;
  createdAt: string;
  updatedAt: string;
}
```

### 默认内置 Tools

```typescript
export const BUILTIN_TOOLS: Omit<ToolDefinition, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'file_read',
    displayName: '文件读取',
    description: '读取指定路径的文件内容',
    category: 'file',
    source: 'builtin',
    enabled: true,
    parameters: [
      { name: 'path', type: 'string', description: '文件路径', required: true },
      { name: 'encoding', type: 'string', description: '编码格式', required: false, defaultValue: 'utf-8' },
    ],
    riskLevel: 'low',
    requiresApproval: false,
    version: '1.0.0',
  },
  {
    name: 'file_write',
    displayName: '文件写入',
    description: '将内容写入指定路径的文件',
    category: 'file',
    source: 'builtin',
    enabled: true,
    parameters: [
      { name: 'path', type: 'string', description: '文件路径', required: true },
      { name: 'content', type: 'string', description: '文件内容', required: true },
    ],
    riskLevel: 'medium',
    requiresApproval: false,
    version: '1.0.0',
  },
  {
    name: 'shell_exec',
    displayName: 'Shell 命令执行',
    description: '在工作目录下执行 Shell 命令',
    category: 'shell',
    source: 'builtin',
    enabled: true,
    parameters: [
      { name: 'command', type: 'string', description: '要执行的命令', required: true },
      { name: 'cwd', type: 'string', description: '工作目录', required: false },
      { name: 'timeout', type: 'number', description: '超时（毫秒）', required: false, defaultValue: 30000 },
    ],
    riskLevel: 'high',
    requiresApproval: true,
    version: '1.0.0',
  },
  {
    name: 'git_status',
    displayName: 'Git 状态查看',
    description: '查看工作区 Git 状态',
    category: 'git',
    source: 'builtin',
    enabled: true,
    parameters: [
      { name: 'repoPath', type: 'string', description: '仓库路径', required: true },
    ],
    riskLevel: 'low',
    requiresApproval: false,
    version: '1.0.0',
  },
  {
    name: 'git_commit',
    displayName: 'Git 提交',
    description: '执行 git add + commit',
    category: 'git',
    source: 'builtin',
    enabled: true,
    parameters: [
      { name: 'repoPath', type: 'string', description: '仓库路径', required: true },
      { name: 'message', type: 'string', description: '提交信息', required: true },
      { name: 'files', type: 'array', description: '要暂存的文件', required: false },
    ],
    riskLevel: 'medium',
    requiresApproval: false,
    version: '1.0.0',
  },
];
```

## 与现有 Ability 的关系

现有的 `Ability`（页面级权限开关）保留但迁移到系统设置的权限管理中，不再占用"辅助能力"页面。`/capabilities` 页面完全改造为 Tools & Skills 管理。

## 实现文件

- `server/src/models/tool.ts` — Tool 数据模型 + 内置 Tools
- `server/src/models/skill.ts` — Skill 数据模型
- `server/src/services/toolService.ts` — Tool CRUD + 注册
- `server/src/services/skillService.ts` — Skill CRUD + 磁盘同步

## 依赖关系

- 无前置依赖，可独立开发
- 后续任务 30（API）、31（前端）、32（导入导出）依赖此任务

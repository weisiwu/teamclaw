# 06【P0】Tools/Skills 数据模型重新设计

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
export type ToolCategory = 'file' | 'git' | 'shell' | 'api' | 'browser' | 'custom';
export type ToolSource = 'builtin' | 'user' | 'imported';

export interface ToolDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: ToolCategory;
  source: ToolSource;
  enabled: boolean;
  parameters: ToolParameter[];
  outputSchema?: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  version: string;
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
export type SkillCategory = 'build' | 'deploy' | 'test' | 'structure' | 'coding' | 'review' | 'custom';
export type SkillSource = 'generated' | 'user' | 'imported';

export interface SkillDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: SkillCategory;
  source: SkillSource;
  content: string;               // Markdown 内容
  filePath?: string;
  applicableAgents: string[];
  enabled: boolean;
  tags: string[];
  version: string;
  createdAt: string;
  updatedAt: string;
}
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
- 后续任务 08（API）、11（前端）、20（导入导出）依赖此任务

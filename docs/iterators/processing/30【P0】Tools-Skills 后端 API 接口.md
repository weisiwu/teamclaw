# 30【P0】Tools/Skills 后端 API 接口

## 背景

任务 29 完成数据模型设计后，需要提供完整的后端 API 接口，支持 Tools 和 Skills 的 CRUD、启用/禁用、以及与磁盘 Skills 文件（`~/.openclaw/skills/`）的同步。

## API 接口设计

### Tools 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/tools` | 获取所有 Tool 列表（支持 ?category=&source=&enabled= 筛选） |
| GET | `/api/v1/tools/:id` | 获取单个 Tool 详情 |
| POST | `/api/v1/tools` | 创建自定义 Tool（source=user） |
| PUT | `/api/v1/tools/:id` | 更新 Tool 配置 |
| DELETE | `/api/v1/tools/:id` | 删除 Tool（仅 user/imported 类型可删） |
| PUT | `/api/v1/tools/:id/toggle` | 启用/禁用 Tool |
| GET | `/api/v1/tools/categories` | 获取所有分类及数量 |

### Skills 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/skills` | 获取所有 Skill 列表（支持 ?category=&source=&agent= 筛选） |
| GET | `/api/v1/skills/:id` | 获取单个 Skill 详情（含 content 全文） |
| POST | `/api/v1/skills` | 创建 Skill |
| PUT | `/api/v1/skills/:id` | 更新 Skill |
| DELETE | `/api/v1/skills/:id` | 删除 Skill |
| PUT | `/api/v1/skills/:id/toggle` | 启用/禁用 Skill |
| POST | `/api/v1/skills/sync` | 从磁盘 `~/.openclaw/skills/` 目录同步已生成的 Skill 文件 |
| GET | `/api/v1/skills/categories` | 获取分类及数量 |

### 导入导出接口（供任务 32 使用）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/tools/import` | 批量导入 Tools（JSON） |
| GET | `/api/v1/tools/export` | 导出所有 Tools（JSON 下载） |
| POST | `/api/v1/skills/import` | 批量导入 Skills（JSON 或 Markdown ZIP） |
| GET | `/api/v1/skills/export` | 导出所有 Skills（JSON 下载） |

### Skills 磁盘同步逻辑

`POST /api/v1/skills/sync` 工作流程：

1. 扫描 `~/.openclaw/skills/` 下所有 `.md` 文件
2. 对比数据库中已有记录（按 filePath 匹配）
3. 新文件 → 创建 Skill（source=generated）
4. 已有但内容变化 → 更新 content + updatedAt
5. 数据库有但文件已删 → 标记为 orphan（不自动删除）
6. 返回同步报告：{ added: N, updated: N, orphaned: N }

## 请求/响应示例

**创建 Tool：**
```json
POST /api/v1/tools
{
  "name": "http_request",
  "displayName": "HTTP 请求",
  "description": "发送 HTTP 请求到指定 URL",
  "category": "api",
  "parameters": [
    { "name": "url", "type": "string", "description": "请求 URL", "required": true },
    { "name": "method", "type": "string", "description": "HTTP 方法", "required": false, "defaultValue": "GET" },
    { "name": "body", "type": "object", "description": "请求体", "required": false }
  ],
  "riskLevel": "medium",
  "requiresApproval": true
}
```

**创建 Skill：**
```json
POST /api/v1/skills
{
  "name": "react-coding-guide",
  "displayName": "React 编码规范",
  "description": "React 项目编码规范和最佳实践",
  "category": "coding",
  "content": "# React 编码规范\n\n## 组件命名\n...",
  "applicableAgents": ["coder1", "coder2"],
  "tags": ["react", "frontend", "coding-style"]
}
```

## 实现文件

- `server/src/routes/tool.ts` — Tool 路由
- `server/src/routes/skill.ts` — Skill 路由
- `server/src/services/toolService.ts` — Tool 业务逻辑
- `server/src/services/skillService.ts` — Skill 业务逻辑 + 磁盘同步
- `server/src/index.ts` — 注册新路由

## 依赖关系

- 依赖任务 29（数据模型）
- 任务 31（前端）和 32（导入导出）依赖此任务

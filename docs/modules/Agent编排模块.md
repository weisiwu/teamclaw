---
title: Agent编排模块
category: 架构设计
created: 2026-03-17
updated: 2026-03-17
---

# Agent 编排模块

[← 返回主文档](../系统架构.V1.md)

---

> ⚠️ **数据源要求**：严格禁止使用 mock 数据或伪造数据。所有数据必须来自真实项目仓库（默认 https://github.com/weisiwu/teamclaw ）。数据源可在 [项目导入模块](./项目导入模块.md) 中通过「URL 下载」或「本地上传」方式切换。
>
> 🎨 **样式检测要求**：每个功能在实现过程中，必须检测并验证实际渲染的 UI 样式（布局、间距、配色、响应式等），确保页面展示效果与设计一致，禁止只关注逻辑而忽略样式。

---

## 1. 团队成员

| Agent | 角色 | 等级 | 职责 | 是否在群 |
|-------|------|------|------|---------|
| **main** | 主管 | Lv3 | 任务分配与质量把控，不做具体工作 | ✅ |
| **pm** | 产品经理 | Lv2 | 需求拆分与细化，收集整理群消息 | ✅ |
| **reviewer** | 代码审查 | Lv2 | 代码审查，问题发现与修复建议 | ❌ |
| **coder1** | 程序员1号 | Lv1 | 代码编写与实现 | ❌ |
| **coder2** | 程序员2号 | Lv1 | 代码编写与实现 | ❌ |

---

## 2. 等级与指派

```
Lv3 (main) ──指派──→ Lv2 (pm, reviewer)
                           │
                           └──指派──→ Lv1 (coder1, coder2)
```

**规则**：
- 高级可指派低级，反向不可
- 只有 main 和 pm 暴露在群聊中，避免用户直接给低级 Agent 下达混乱指令

---

## 3. PM 交互协议

pm 在接收需求时遵循结构化流程：

1. 提出 **不超过 N 个**澄清问题
2. 等待用户逐一回复
3. 每条回复记入记忆
4. 全部回复完毕后，生成结构化需求文档，进入下一步

### 示例对话

```
用户: @pm 我想在首页加个按钮

pm: 好的，我需要确认几个问题：
    1. 按钮的文字是什么？
    2. 按钮点击后要跳转到哪里？
    3. 按钮的样式有特殊要求吗？

用户: 文字是"立即购买"

pm: 收到，还有2个问题等待回复

用户: 跳转到商品详情页

pm: 收到，还有1个问题等待回复

用户: 样式用主题色，圆角按钮

pm: 好的，所有问题已回复完毕。我已生成需求文档，
    现在将任务分配给开发团队。
```

---

## 4. Agent 实例隔离

```
~/.openclaw/agents/
  ├── main/          # 独立 workspace + session
  ├── coder1/
  ├── coder2/
  ├── reviewer/
  └── pm/

共享资源：
  ~/.openclaw/skills/        # 所有 agent 共享 Skills
  ~/.openclaw/workspace/     # 共享项目代码
  ~/.openclaw/memory/        # 共享记忆库（有写入锁）
```

**隔离原则**：
- 每个 Agent 有独立的工作空间和会话
- 共享资源通过文件锁机制避免冲突
- Agent 之间通过结构化文件传递信息

---

## 5. 角色详细职责

### 5.1 main（主管）

- **不做具体工作**：只负责任务分配和质量把控
- **与用户对话**：讨论需求，确认任务
- **任务分配**：将任务分配给 pm 或 reviewer
- **质量把控**：审查最终结果，决定是否通过

### 5.2 pm（产品经理）

- **需求细化**：通过结构化问答细化需求
- **收集群消息**：整理群聊中的需求和反馈
- **生成需求文档**：将对话转化为结构化需求文档
- **任务同步**：在群内同步任务信息

### 5.3 reviewer（代码审查）

- **代码审查**：检查代码质量、规范、安全性
- **问题发现**：发现潜在 Bug 和改进点
- **修复建议**：给出具体的修复建议
- **与 coder 对话**：通过 AutoGen 对话循环完成审查

### 5.4 coder1/coder2（程序员）

- **代码编写**：根据需求编写代码
- **文件操作**：创建、修改、删除文件
- **Git 操作**：提交代码、创建分支
- **自测**：运行测试，确保代码可用

---

## 6. Agent 协作流程

```
用户 @main "我想加个按钮"
    │
    ▼
main 与用户对话，确认需求
    │
    ▼
main 指派给 pm
    │
    ▼
pm 提出澄清问题，等待回复
    │
    ▼
pm 生成需求文档，指派给 coder1
    │
    ▼
coder1 编写代码
    │
    ▼
coder1 完成后，main 指派给 reviewer
    │
    ▼
reviewer 审查代码
    │
    ├── 有问题 ──→ reviewer 与 coder1 对话修复
    │
    └── 无问题 ──→ main 在群内通知「任务已完成」
```

---

## 7. API 定义

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/agents` | 获取所有 Agent 列表及状态 |
| `GET` | `/api/v1/agents/:agentName` | 获取单个 Agent 详情（角色、等级、当前任务） |
| `PUT` | `/api/v1/agents/:agentName/config` | 更新 Agent 配置（模型、Prompt 模板等） |
| `GET` | `/api/v1/agents/:agentName/sessions` | 获取 Agent 历史会话列表 |
| `POST` | `/api/v1/agents/:agentName/dispatch` | 向指定 Agent 分发任务 |
| `GET` | `/api/v1/agents/team` | 获取团队编排概览（等级关系、指派矩阵） |

**GET /api/v1/agents 响应示例**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "name": "main",
        "role": "主管",
        "level": 3,
        "status": "idle",
        "currentTask": null,
        "inGroup": true,
        "model": "claude-sonnet-3.5"
      },
      {
        "name": "coder1",
        "role": "程序员1号",
        "level": 1,
        "status": "busy",
        "currentTask": "t_20260316_002",
        "inGroup": false,
        "model": "claude-sonnet-3.5"
      }
    ]
  },
  "message": "ok"
}
```

---

## 8. 实现任务清单

> 前置依赖：人员与权限模块验收通过。

### 任务 8.1：后端 - Agent 管理

| # | 任务 | 产出文件 | 说明 |
|---|------|---------|------|
| 1 | Agent 配置数据模型 | `server/src/models/agent.ts` | Agent 类型定义、默认配置、等级枚举 |
| 2 | Agent 管理路由 | `server/src/routes/agent.ts` | 上述 6 个 API 端点 |
| 3 | Agent 管理服务 | `server/src/services/agentService.ts` | Agent 状态管理、配置更新、团队编排查询 |
| 4 | Agent 指派规则引擎 | `server/src/services/dispatchService.ts` | 等级校验（高→低）、Agent 可用性检查、负载均衡选择 coder |
| 5 | Agent 常量定义 | `server/src/constants/agents.ts` | 5 个 Agent 默认配置、等级矩阵、指派规则 |

### 任务 8.2：后端 - Agent 实例隔离

| # | 任务 | 产出文件 | 说明 |
|---|------|---------|------|
| 1 | Agent 工作空间管理 | `server/src/services/agentWorkspace.ts` | 创建/清理 Agent 独立工作目录 |
| 2 | 共享资源锁管理 | `server/src/services/resourceLock.ts` | Skills、workspace、memory 的文件锁机制 |
| 3 | Agent 初始化脚本 | `server/src/services/agentInit.ts` | 首次启动时创建 5 个 Agent 目录和默认配置 |

### 任务 8.3：前端 - Agent 管理页面

| # | 任务 | 产出文件 | 说明 |
|---|------|---------|------|
| 1 | Agent 团队概览页 | `dashboard/src/pages/AgentTeam/index.tsx` | 卡片式展示 5 个 Agent，显示角色/等级/状态/当前任务 |
| 2 | Agent 详情面板 | `dashboard/src/pages/AgentTeam/AgentDetail.tsx` | 侧滑面板：配置、历史会话、当前任务 |
| 3 | 等级关系图组件 | `dashboard/src/pages/AgentTeam/HierarchyChart.tsx` | 可视化展示 Lv3→Lv2→Lv1 指派关系 |
| 4 | Agent API 封装 | `dashboard/src/services/agent.ts` | 封装上述 6 个 API |
| 5 | Agent 状态标签组件 | `dashboard/src/components/AgentStatusBadge.tsx` | idle/busy/error 不同颜色状态标签 |

---

## 9. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | `GET /api/v1/agents` 返回 5 个 Agent 的完整信息 | curl 验证 |
| 2 | Agent 团队概览页正确展示 5 张卡片，角色/等级/状态信息正确 | 浏览器截图 |
| 3 | 等级关系图正确展示 Lv3→Lv2→Lv1 指派链路 | 浏览器截图 |
| 4 | 修改 Agent 配置后刷新页面数据持久化 | 操作验证 |
| 5 | 指派规则引擎正确拒绝低级向高级指派 | 单元测试 |
| 6 | Agent 工作目录已正确创建，共享资源目录存在 | 文件系统检查 |
| 7 | 所有页面样式正确，卡片布局响应式适配 | 浏览器样式检查 |

---

[← 上一章：人员与权限模块](./人员与权限模块.md) | [返回主文档](../系统架构.V1.md) | [下一章：消息机制模块 →](./消息机制模块.md)

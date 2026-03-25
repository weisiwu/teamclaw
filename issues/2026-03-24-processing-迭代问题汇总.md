# teamclaw 功能迭代（processing）问题汇总

> 生成日期：2026-03-24
> 项目：teamclaw
> 迭代次数：37 轮
> 状态：全部完成 ✅

---

## 一、已跳过任务（文档标记已完成）

| ID | 任务 | 跳过原因 |
|----|------|----------|
| 01【P0】 | 辅助能力管理页面打开报错修复 | ✅ 已修复 |
| 02【P0】 | 删除误创建的 --version 目录 | ✅ 已修复 |
| 03【P0】 | Agent 团队页面加载失败修复 | ✅ 已修复 |

---

## 二、实际修复的问题

### 2.1 04【P0】SQLite stub 导致版本路由返回空数据
**问题**：项目使用 SQLite stub 返回空数据，而非真实 PostgreSQL 数据。

**修复**：
- 删除 `sqlite.ts` stub
- 22 个文件迁移到 `pg.ts`
- Build 通过

### 2.2 05【P0】API Token 数据模型与 CRUD 接口
**问题**：缺少 API Token 管理功能。

**修复**：
- 新建 8 个文件，547 行新增
- AES-256 加密
- 6 个 API 路由
- Build 通过

### 2.3 06【P0】Tools-Skills 数据模型重新设计
**问题**：Tools 和 Skills 数据模型需要重新设计。

**修复**：新建 6 个文件：
- `tool.ts` model
- `skill.ts` model
- `toolService.ts`
- `skillService.ts`
- `tool.ts` route
- `skill.ts` route

### 2.4 07【P0】Agent-Token 绑定规则与调度逻辑
**问题**：Agent 和 Token 之间的绑定关系未实现。

**修复**：新建 5 个文件：
- `agentTokenBinding.ts` model
- `agentTokenBindingService.ts`
- `tokenResolver.ts`
- API routes
- Build 通过

### 2.5 08【P0】Tools-Skills 后端 API 接口
**问题**：Tools-Skills 后端 API 不完整。

**修复**：补充 import/export API（tools + skills）和 skill toggle 端点，5 文件变更，910 行新增，Build 通过

### 2.6 09【P0】LLM 服务改造 - 支持按 Agent 动态选择 Token
**问题**：LLM 服务使用硬编码 Token。

**修复**：
- `llmService` 改为动态 Token 注入
- `agentExecution` 传入 `targetAgent`
- `recordUsage` 用量记录
- 4 文件，build 通过

### 2.7 10【P0】前端 - API Token 管理页面
**问题**：缺少 API Token 管理 UI。

**修复**：
- 前端 API Token 管理页面（列表/创建/编辑/验证/删除）
- 8 文件，1166 行新增
- Build 通过

### 2.8 11【P0】前端 - Tools & Skills 管理页面重构
**问题**：Tools & Skills 管理页面需要重构。

**修复**：
- 17 个文件，1569 行新增/171 行删除
- capabilities 页面重写（1031 行）
- API routes（tools/skills 全套 CRUD+import/export）
- Build 通过

### 2.9 12【P0】前端 - Agent Token 绑定配置 UI
**问题**：缺少 Agent Token 绑定配置界面。

**修复**：
- 全局绑定矩阵页 `/agent-tokens`
- Agent 详情 Token 配置 Tab
- API 封装+hooks+代理路由
- 9 文件，1387 行新增
- Build 通过

### 2.10 13【P1】服务层内存状态未持久化
**问题**：`tokenStatsService`、`agentExecution`、`taskMemory` 使用内存 Map。

**修复**：
- 迁移到 PostgreSQL
- 10 文件，621 行新增
- Build 通过

### 2.11 14【P1】Agent 配置持久化 - 从硬编码迁移到数据库
**问题**：Agent 配置硬编码在代码中。

**修复**：
- `agents` 表迁移
- `agentService` 重写为 DB 驱动
- seed/CRUD/缓存
- 8 文件，499 行新增
- Build 通过

### 2.12 15【P1】Shell 命令注入风险
**问题**：`changeTracker.ts`、`docConverter.ts`、`codeApplicator.ts` 使用 `execSync` 存在注入风险。

**修复**：改为 `execFileSync`/`execFile` 防止注入

### 2.13 18【P1】Demo 数据 Seed 机制与清除能力
**问题**：缺少 Demo 数据管理功能。

**修复**：
- 9 文件，1201 行新增
- `demoSeed` 服务
- Demo 数据 JSON 文件
- Demo API routes
- 数据库迁移
- 前端设置页 Demo 管理区块
- Build 通过

### 2.14 22【P1】Skills 注入 Agent Prompt 集成
**问题**：Skills 未注入到 Agent Prompt。

**修复**：`buildAgentMessages` 集成 `skillService.getSkillsForAgent`+`truncateSkills` 调用，2 文件，39 行新增

### 2.15 27【P1】Import 页面未使用 UI 组件库
**问题**：`app/import/page.tsx` 未使用统一的 UI 组件库。

**修复**：
- 2 个数据源切换按钮替换为 Button 组件
- 183 行新增/199 行删除（格式整理）
- Build 通过

### 2.16 28【P2】ID 生成方式不安全（Math.random 替换）
**问题**：多处使用 `Math.random()` 生成 ID 不安全。

**修复**：`generateId` 工具函数替换 `server/src` 中所有 `Math.random` ID 生成

### 2.17 31【P2】硬编码颜色未使用语义化设计令牌
**问题**：多处使用硬编码颜色值。

**修复**：按对照表将硬编码颜色替换为语义化设计令牌（`text-foreground`、`bg-card`、`border-border`、`text-muted-foreground`、`bg-muted`）。处理 5 个文件，111 行替换。

### 2.18 32【P2】Toast 通知机制未统一
**问题**：Toast 通知机制未统一。

**修复**：统一 Toast 组件使用

### 2.19 33【P2】Monitor 页面中英文混用
**问题**：Monitor 页面中英文混用。

**修复**：统一使用中文或国际化

### 2.20 34【P2】加载状态骨架屏风格不统一
**问题**：骨架屏风格不统一。

**修复**：统一骨架屏组件

### 2.21 35【P2】数据表格样式未使用设计系统工具类
**问题**：数据表格样式未使用设计系统工具类。

**修复**：统一使用设计系统工具类

---

## 三、统计

| 指标 | 数值 |
|------|------|
| 总迭代次数 | 37 |
| 任务跳过 | 3 |
| 实际修复 | 21+ |
| 代码变更文件 | 150+ |
| 新增代码行 | 8000+ |

# 迭代 69 PRD - 变更追踪（版本关联消息截图 + 变更摘要）

## 1. 背景与目标

**背景**：teamclaw 已具备版本列表、Tag 管理、版本 bump、变更文件列表（diff）等能力，但变更记录分散，缺乏**以版本为中心的一站式变更档案**——开发者无法快速回溯"这个版本关联了哪些飞书讨论截图"、"生成了哪些变更摘要"。

**目标**：为每个版本建立完整的变更档案：关联飞书消息截图、存储 AI 生成的变更摘要，形成可追溯的版本变更记录。

---

## 2. 用户故事

### US-1：关联消息截图到版本
> **As a** 开发者  
> **I want to** 从飞书消息列表中选择一条消息并关联到指定版本  
> **So that** 我可以记录版本相关的讨论上下文，不用手动截图保存

### US-2：查看版本关联的截图
> **As a** 开发者  
> **I want to** 在版本详情页查看所有关联的截图缩略图，点击放大  
> **So that** 我可以快速回顾该版本的决策背景

### US-3：解除截图关联
> **As a** 开发者  
> **I want to** 移除一条错误关联的截图  
> **So that** 保持版本变更档案的准确性

### US-4：自动生成变更摘要
> **As a** 开发者  
> **I want to** 点击"生成变更摘要"按钮，自动根据 diff 文件列表生成变更摘要  
> **So that** 不用手动编写 changelog，省时且格式统一

### US-5：手动编辑变更摘要
> **As a** 开发者  
> **I want to** 在 AI 生成后手动修改摘要内容并保存  
> **So that** AI 结果不准确时可以修正

### US-6：查看版本变更时间线
> **As a** 开发者  
> **I want to** 在版本详情页查看截图关联时间和摘要生成时间的完整时间线  
> **So that** 全面了解该版本的变更历史

### US-7：批量管理截图关联
> **As a** 开发者  
> **I want to** 在版本面板（Tag 面板）中批量查看/筛选已关联截图的版本  
> **So that** 快速检查哪些版本缺少截图或摘要

---

## 3. 功能清单

| 编号 | 功能点 | 优先级 | 描述 |
|------|--------|--------|------|
| F1 | 消息选择器增强 | P0 | 飞书消息列表 → 关联到版本；支持搜索、翻页 |
| F2 | 截图上传/URL 存储 | P0 | 消息截图 URL 存入 `version_screenshots` 表 |
| F3 | 截图画廊展示 | P0 | 版本详情 Tab：缩略图网格 → 点击放大 Modal |
| F4 | 截图解绑 | P0 | 单个截图的删除/解关联 |
| F5 | AI 变更摘要生成 | P1 | 传入 `changedFiles[]` → 调用 AI 生成结构化摘要 |
| F6 | 变更摘要编辑保存 | P1 | 支持 Markdown 编辑、覆盖保存 |
| F7 | 版本变更时间线 | P1 | 版本详情页时间线：截图关联、摘要生成 events |
| F8 | 版本面板截图筛选 | P2 | Tag 面板增加"有截图"/"有摘要"筛选 |

---

## 4. 验收标准

### AC-1 消息截图关联
- [ ] 用户点击"关联截图"按钮，弹出消息选择器
- [ ] 消息选择器支持搜索消息内容
- [ ] 选择消息后，截图 URL 存入后端，返回截图记录
- [ ] 版本详情 Tab 显示新关联的截图（刷新后）

### AC-2 截图画廊
- [ ] 缩略图以网格展示（每行 3-4 张）
- [ ] 点击缩略图打开全屏 Modal，支持左右翻页
- [ ] 截图卡片显示发送者名称和时间

### AC-3 截图解绑
- [ ] 每个截图卡片有"解绑"按钮
- [ ] 解绑后截图从列表移除（前端更新）

### AC-4 AI 变更摘要生成
- [ ] "生成摘要"按钮调用后端 API，传入 `changedFiles` 列表
- [ ] 生成完成前显示 loading 状态
- [ ] 生成后摘要展示在变更摘要 Tab，包含：新增功能、变更内容、Bug 修复、破坏性变更分类
- [ ] 重复生成覆盖旧摘要

### AC-5 变更摘要编辑
- [ ] 支持 Markdown 编辑器
- [ ] 点击"保存"将内容持久化到后端
- [ ] 保存成功后显示保存时间

### AC-6 版本变更时间线
- [ ] 时间线展示：版本创建、截图关联（每张）、摘要生成 events
- [ ] 时间线按时间倒序排列
- [ ] 每条 event 显示 icon、时间和描述

### AC-7 版本面板截图筛选
- [ ] Tag 面板筛选器增加"有截图"选项
- [ ] 筛选后只显示关联了截图的版本 Tag 卡片

---

## 5. 数据模型

```typescript
// 截图关联记录（已有字段，待后端实现）
interface VersionMessageScreenshot {
  id: string;
  versionId: string;       // 关联版本 ID
  messageId: string;      // 飞书消息 ID
  messageContent: string;  // 消息文本摘要
  senderName: string;      // 发送者名称
  senderAvatar?: string;   // 发送者头像 URL
  screenshotUrl: string;   // 截图完整 URL
  thumbnailUrl?: string;   // 缩略图 URL
  createdAt: string;
}

// 变更摘要（已有字段，待后端实现）
interface VersionChangelog {
  id: string;
  versionId: string;
  title: string;           // AI 生成或手动填写的标题
  content: string;        // Markdown 格式变更摘要
  changes: ChangelogChange[];
  generatedAt: string;
  generatedBy: string;     // 'AI' | 'manual'
}

interface ChangelogChange {
  type: 'feature' | 'fix' | 'improvement' | 'breaking' | 'docs' | 'refactor' | 'other';
  description: string;
  files?: string[];       // 关联的变更文件
}
```

---

## 6. API 端点

### 6.1 新增端点

| 方法 | 路径 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/v1/versions/:id/screenshots` | 获取版本关联截图列表 | - | `ScreenshotListResponse` |
| POST | `/api/v1/versions/:id/screenshots` | 关联截图到版本 | `LinkScreenshotRequest` | `VersionMessageScreenshot` |
| DELETE | `/api/v1/versions/:id/screenshots/:screenshotId` | 解绑截图 | - | `{ success: boolean }` |
| GET | `/api/v1/versions/:id/changelog` | 获取版本变更摘要 | - | `ChangelogResponse` |
| POST | `/api/v1/versions/:id/changelog/generate` | AI 生成变更摘要 | `GenerateChangelogRequest` | `VersionChangelog` |
| PUT | `/api/v1/versions/:id/changelog` | 保存手动编辑的变更摘要 | `{ content: string }` | `VersionChangelog` |
| GET | `/api/v1/versions/:id/timeline` | 获取版本变更时间线 | - | `TimelineResponse` |

### 6.2 待修改端点

| 方法 | 路径 | 修改内容 |
|------|------|----------|
| POST | `/api/v1/versions` | 新增版本时可选传入截图列表（批量关联） |
| GET | `/api/v1/versions` | 增加 `hasScreenshot` / `hasChangelog` 筛选参数 |

---

## 7. 前端组件

### 7.1 需新增组件

| 组件 | 文件 | 描述 |
|------|------|------|
| `VersionTimeline` | `components/versions/VersionTimeline.tsx` | 版本变更时间线（dialog 形式） |
| `MessageSelector` | `components/versions/MessageSelector.tsx` | 飞书消息选择器（dialog + 搜索 + 翻页） |
| `ScreenshotGallery` | `components/versions/ScreenshotGallery.tsx` | 截图画廊（网格 + 放大 Modal） |
| `ChangelogPanel` | `components/versions/ChangelogPanel.tsx` | 变更摘要展示/编辑面板 |

### 7.2 需修改组件

| 组件 | 修改内容 |
|------|----------|
| `app/versions/page.tsx` | `VersionDetailDialog` 增加 timeline tab；消息选择器入口 |
| `components/versions/` | 将现有的 stub 实现替换为真实 API 调用 |

---

## 8. 技术实现注意事项

1. **截图存储**：截图以 URL 形式存储（飞书消息图片 CDN URL），不做文件上传
2. **AI 生成摘要**：调用现有的 AI 接口，传入 `changedFiles` 字符串数组，Prompt 模板输出结构化 JSON（features/changes/fixes/breaking）
3. **时间线数据**：合并截图关联记录 + changelog 生成记录，按 `createdAt` 排序
4. **消息来源**：消息选择器调用飞书消息历史 API（`/im/v1/messages`）
5. **Mock 数据**：后端 API 实现前，前端继续使用 `lib/api/versions.ts` 中的 mock 数据，但结构要对齐真实响应格式

---

## 9. 非功能需求

- **性能**：截图画廊懒加载，缩略图最大 200px
- **兼容性**：支持飞书企业自建应用获取消息历史（需 `im:message:readonly` 权限）
- **数据校验**：截图 URL 必须为有效 HTTP/HTTPS URL；changelog content 最大 50000 字符

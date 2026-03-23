# 【P1】M8 导入路由已知 Bug 修复

> 优先级：P1（中）
> 前置依赖：无（可独立执行）
> 关联模块：[项目导入模块](../modules/项目导入模块.md)

---

## 1. 问题描述

项目导入模块的路由和服务中存在多个已知 Bug，会导致运行时报错或数据不一致。这些 Bug 相互独立，可逐个修复。

---

## 2. Bug 清单

### Bug 1：projectRefresh 导入路径错误

**文件**：`server/src/routes/project.ts` 第 202 行

```typescript
// 当前（错误）
const { refreshProject } = await import('./services/projectRefresh.js');

// 正确（routes/ 和 services/ 是兄弟目录）
const { refreshProject } = await import('../services/projectRefresh.js');
```

**影响**：`POST /api/v1/projects/:id/refresh` 接口调用时必定 500 报错，模块找不到。

---

### Bug 2：技术栈检测重复实现

**文件**：`server/src/routes/project.ts` 第 264-303 行

路由文件内定义了 `detectTechStack()` 和 `detectBuildTool()` 两个内联函数，功能与 `services/techDetector.ts` 重复，但实现更简陋（仅基于文件扩展名，不读 package.json 分析 ORM/框架）。

**修复方案**：
- 移除 `project.ts` 中的内联 `detectTechStack()` 和 `detectBuildTool()`
- 改为导入并调用 `techDetector.ts` 的 `detectTechStack(projectPath)`
- 注意：`techDetector.ts` 返回 `TechStack` 对象（含 framework/language/buildTool 等），需要将其映射到 `Project` 的 `techStack: string[]` 和 `buildTool: string` 字段

```typescript
// 改造前
techStack: detectTechStack(tree),      // 内联函数，接收 tree
buildTool: detectBuildTool(tree),      // 内联函数，接收 tree

// 改造后
import { detectTechStack as detectTech } from '../services/techDetector.js';
const tech = await detectTech(projectPath);  // 接收路径
techStack: [...tech.language, ...tech.framework],
buildTool: tech.buildTool[0] || undefined,
```

---

### Bug 3：Git 历史 API 响应格式与前端不匹配

**后端**：`GET /api/v1/projects/:id/git-history` 返回 `analyzeGitHistory()` 的结果，类型为 `GitHistoryAnalysis` 对象：

```json
{
  "analysis": {
    "totalCommits": 42,
    "patterns": [...],
    "recentSummary": "...",
    "topAuthors": [...]
  }
}
```

**前端**：`app/projects/[id]/page.tsx` 第 313 行期望 `analysis` 是一个提交数组：

```typescript
setGitHistory(json.data.analysis || []);
// 后续当作 { hash, message, author, date }[] 遍历渲染
```

**修复方案**（二选一）：
- **方案 A**（推荐）：后端路由添加 commits 字段，同时返回分析结果和原始提交列表
- **方案 B**：前端适配 `GitHistoryAnalysis` 结构，展示 patterns + topAuthors + recentSummary

---

### Bug 4：refreshProject 中 analyzeGitHistory 返回值误用

**文件**：`server/src/services/projectRefresh.ts` 第 81-83 行

```typescript
const history = analyzeGitHistory(projectPath);
result.newCommits = history.length;  // ❌ GitHistoryAnalysis 不是数组，没有 .length
```

应改为：
```typescript
result.newCommits = history.totalCommits;
```

---

### Bug 5：flattenFiles 类型签名不准确

**文件**：`server/src/routes/project.ts` 第 300-304 行

`flattenFiles` 函数的参数类型过于松散，且递归调用时使用了复杂的类型断言 `as`。在移除内联 helper 时可一并清理。

---

## 3. 实施步骤

| # | 操作 | 涉及文件 |
|---|------|---------|
| 1 | 修复 refreshProject 导入路径 | `server/src/routes/project.ts` |
| 2 | 移除内联 detectTechStack/detectBuildTool，改用 techDetector | `server/src/routes/project.ts` |
| 3 | 修复 Git 历史 API 响应格式 | `server/src/routes/project.ts` + `app/projects/[id]/page.tsx` |
| 4 | 修复 refreshProject 中 history.length 误用 | `server/src/services/projectRefresh.ts` |
| 5 | 清理 flattenFiles 等废弃 helper | `server/src/routes/project.ts` |

---

## 4. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | POST /projects/:id/refresh 不再 500 | curl 调用验证 |
| 2 | 技术栈识别结果包含 ORM、框架等详细信息 | 导入项目后查看详情页 |
| 3 | Git 历史页正确展示提交列表和统计 | 浏览器查看 |
| 4 | TypeScript 编译无类型错误 | `tsc --noEmit` |

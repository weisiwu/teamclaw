# 项目导入向导

## 页面路由

```
/import
```

## 页面功能描述

项目导入向导（4 步引导流程），帮助用户将 Git 仓库导入 teamclaw：
- **步骤 1 - 选择数据源**：支持 Git 仓库 URL 或本地路径
- **步骤 2 - 确认项目信息**：展示识别到的名称、技术栈、构建工具、Git 状态
- **步骤 3 - 解析进度**：实时展示 13 步解析过程（克隆、扫描、检测技术栈等）
- **步骤 4 - 完成**：展示导入结果，提供跳转入口

导入状态通过轮询（每 3 秒）获取。

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `StepIndicator` | 内联函数 | 步骤指示器渲染 |
| `Step1Form` | 内联函数 | 步骤 1：选择数据源表单 |
| `Step2Confirm` | 内联函数 | 步骤 2：确认信息表单 |
| `Step3Progress` | 内联函数 | 步骤 3：解析进度展示 |
| `Step4Complete` | 内联函数 | 步骤 4：完成页面 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `currentStep` | `useState<1 \| 2 \| 3 \| 4>` | 当前步骤 |
| `source` | `useState<'url' \| 'local'>` | 数据源类型 |
| `url` | `useState<string>` | Git 仓库 URL |
| `localPath` | `useState<string>` | 本地路径 |
| `projectName` | `useState<string>` | 项目名称 |
| `projectInfo` | `useState<ProjectInfo \| null>` | 识别到的项目信息 |
| `taskId` | `useState<string \| null>` | 导入任务 ID |
| `taskData` | `useState<Task \| null>` | 轮询获取的任务状态 |
| `error` | `useState<string \| null>` | 错误信息 |
| `pollIntervalRef` | `useRef` | 轮询定时器引用 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `importProject` | `@/lib/api/projects` | 发起导入任务 |
| `fetchImportStatus` | `@/lib/api/projects` | 轮询导入状态 |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/projects/[id]` | 导入完成，点击"查看项目" | 项目 ID |
| `/projects` | 点击"继续导入" | 重新开始向导 |

## 解析步骤（步骤 3 展示）

| 步骤名 | 含义 |
|--------|------|
| `clone` | 定位/克隆项目 |
| `scan` | 扫描文件结构 |
| `detectTech` | 检测技术栈 |
| `parseDocs` | 解析文档 |
| `analyzeCode` | 分析代码架构 |
| `detectBuild` | 检测打包机制 |
| `compress` | 上下文压缩 |
| `buildSummary` | 生成项目摘要 |
| `generateFeatureMap` | 生成功能定位 |
| `generateSkills` | 生成 Skills |
| `convertDocs` | 文档转换 |
| `vectorize` | 向量化存储 |
| `gitHistory` | Git 历史分析 |

## 轮询机制

- `useRef` 保存 `setInterval` 句柄，避免闭包内存泄漏
- 组件卸载时通过 `useEffect` cleanup 清理定时器
- 每 3 秒轮询一次导入状态

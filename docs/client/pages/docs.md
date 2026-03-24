# 文档库

## 页面路由

```
/docs
```

## 页面功能描述

文档库页面，提供项目文档的搜索和预览功能：
- **文档搜索**：通过 DocSearchBox 搜索文档（按文件名、内容关键词）
- **文件类型筛选**：筛选 Markdown、PDF、图片、代码文件等
- **全选/取消全选**：批量选择文档
- **批量下载**：通过 DownloadManager 批量下载选中文档
- **文档预览**：点击预览按钮，通过 Dialog + DocViewer 展示文档内容
- **下载**：单个文档下载按钮

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `DocSearchBox` | `@/components/docs/DocSearchBox` | 搜索和筛选组件 |
| `DocViewer` | `@/components/docs/DocViewer` | 文档内容预览 |
| `DownloadManager` | `@/components/docs/DownloadManager` | 批量下载管理 |
| `Dialog` | `@/components/ui/dialog` | 预览弹窗 |
| `Badge` | `@/components/ui/badge` | 文件类型徽章 |
| `Button` | `@/components/ui/button` | 操作按钮 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `docs` | `useState<EnhancedSearchResult[]>` | 搜索结果列表 |
| `selectedDoc` | `useState<EnhancedSearchResult \| null>` | 当前预览的文档 |
| `selectedFiles` | `useState<Set<string>>` | 已选择的文档 ID 集合 |
| `isPreviewOpen` | `useState<boolean>` | 预览弹窗开关 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `searchDocs` | `@/lib/api/docs` | 搜索文档（DocSearchBox 内部） |
| `fetch GET` | `/api/v1/docs/[id]/download` | 下载单个文档 |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/docs/[slug]` | — | 静态文档文章页面（不同路由） |

## 文件类型图标映射

| 类型 | 图标颜色 |
|------|---------|
| `md` / `markdown` / `txt` | 蓝色 |
| `pdf` | 红色 |
| 图片（png/jpg/svg等） | 绿色 |
| 代码（js/ts/py/go/rs等） | 紫色 |
| 其他 | 灰色 |

## 文件大小格式化

自动将字节数转换为 KB/MB/GB 等人类可读格式。

## 初始状态

页面加载时 `docs` 初始化为空数组，显示"使用上方搜索框查找文档"提示。

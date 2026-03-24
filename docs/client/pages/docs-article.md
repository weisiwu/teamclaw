# 文档文章

## 页面路由

```
/docs/[slug]
```

其中 `[slug]` 为动态路由参数，代表文档的 slug 标识符（如 `getting-started`）。

## 页面功能描述

文档文章页面，以 Markdown 格式渲染单篇文档内容：
- 使用 `ReactMarkdown` + `remark-gfm` + `rehype-highlight` + `rehype-slug` 渲染富文本
- 支持 GFM（GitHub Flavored Markdown）表格、任务列表等
- 代码块语法高亮（highlight.js）
- 自动生成标题锚点
- 面包屑导航（文档中心 > 文章标题）
- 下载按钮

## 技术实现

| 技术 | 用途 |
|------|------|
| `ReactMarkdown` | Markdown 转 React 组件 |
| `remark-gfm` | GFM 语法支持（表格、任务列表等） |
| `rehype-highlight` | 代码块语法高亮 |
| `rehype-slug` | 标题自动添加锚点 ID |
| `highlight.js` | 代码高亮样式（github-dark） |

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `ReactMarkdown` | `react-markdown` | Markdown 渲染器 |
| `DownloadButton` | `../components/DownloadButton` | 下载按钮 |
| `Link` | `next/link` | 面包屑链接 |

## 服务端数据获取

| 函数 | 用途 |
|------|------|
| `getAllDocs()` | 获取所有文档列表（用于 `generateStaticParams`） |
| `getDocBySlug(slug)` | 根据 slug 获取单篇文档内容 |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/docs` | 点击面包屑"文档中心" | 导航到文档库 |

## 静态生成

页面使用 Next.js App Router 的 `generateStaticParams` 实现静态生成（SSG），在构建时预渲染所有文档页面。

## Not Found 处理

当 `getDocBySlug(slug)` 返回 `null` 时，调用 `notFound()` 显示 404 页面。

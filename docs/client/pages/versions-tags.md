# 版本标签页

## 页面路由

```
/versions/tags
```

## 页面功能描述

版本标签页，提供 Tag 维度的版本管理入口，是 `versions/panel` 页面的另一种展示形式。该页面直接嵌入 `VersionTagsPanel` 组件，适合以嵌入式方式集成到其他布局中。

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `VersionTagsPanel` | `@/components/versions/VersionTagsPanel` | 标签管理完整面板 |

## 页面级状态管理

> 状态管理由 `VersionTagsPanel` 组件内部处理，页面本身无额外状态。

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `useTags` | `@/lib/api/tags` | 获取 Tag 列表（组件内） |

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/versions?tag=xxx` | 点击 Tag | Tag 名称（组件内导航） |

## 技术特点

- 页面高度自适应：`h-[calc(100vh-64px)]`，适配不同屏幕
- 零状态管理：所有逻辑委托给子组件 `VersionTagsPanel`

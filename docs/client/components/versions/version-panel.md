# VersionPanel 组件

## 功能说明

版本管理主面板，是版本页面的核心容器组件。

## 引入

```tsx
import { VersionPanel } from '@/components/versions/VersionPanel';
```

## 位置

`components/versions/VersionPanel.tsx`

## 主要功能

- 版本列表展示（支持分页）
- 版本搜索和过滤
- 版本排序（按时间、版本号等）
- 版本创建入口
- 批量操作入口

## 典型使用

```tsx
// 在版本页面中使用
<VersionPanel projectId={projectId} onVersionSelect={handleSelect} />
```

## 关联组件

- VersionTagsPanel
- BuildHistoryPanel
- VersionHistory

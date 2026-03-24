# 分支管理组件 (branch)

## 目录

`components/branch/` 包含分支管理相关组件：

| 组件                | 说明           |
| ------------------- | -------------- |
| BranchPanel         | 分支管理主面板 |
| BranchSelector      | 分支选择器     |
| BranchMergeDialog   | 分支合并对话框 |
| BranchCompareDialog | 分支对比对话框 |
| MainBranchBadge     | 主分支徽章     |

## BranchPanel

主面板，提供分支列表和操作入口。

## BranchSelector

下拉选择器，用于切换当前分支。

```tsx
<BranchSelector currentBranch={current} onBranchChange={setBranch} />
```

## BranchMergeDialog

合并分支对话框，包含：

- 源分支选择
- 目标分支选择
- 冲突预览
- 合并确认

## BranchCompareDialog

分支对比对话框，展示两个分支的差异。

## MainBranchBadge

显示主分支标识徽章。

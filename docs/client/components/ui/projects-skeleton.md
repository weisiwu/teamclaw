# ProjectsSkeleton 组件

## 功能说明

项目列表骨架屏组件，用于加载状态占位。

## 引入

```tsx
import { ProjectsSkeleton } from '@/components/ui/projects-skeleton';
```

## 使用示例

```tsx
{
  isLoading && <ProjectsSkeleton />;
}
```

## 样式特性

显示 3-6 个项目卡片占位符，包含：

- 项目图标/颜色块
- 项目名称
- 项目描述
- 状态标签
- 动画闪烁效果

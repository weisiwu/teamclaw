# TeamSettings

团队设置面板组件。

## 导入

```tsx
import { TeamSettings } from "@/components/team/TeamSettings";
```

## 概述

`TeamSettings` 是一个业务组件，提供团队相关的配置和管理界面。具体 Props 和功能取决于组件内部实现，通常包含：

- 团队基本信息编辑（名称、描述、Logo）
- 成员权限管理
- 团队设置保存/重置

> 如需详细文档，请参考组件源码 `components/team/TeamSettings.tsx`。

## 使用示例

```tsx
import { TeamSettings } from "@/components/team/TeamSettings";

function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <TeamSettings />
    </div>
  );
}
```

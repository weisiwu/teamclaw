# MemberForm

成员管理表单组件。

## 导入

```tsx
import { MemberForm } from "@/components/members/MemberForm";
import { members } from "@/components/members";  // index 导出
```

## 概述

用于添加/编辑团队成员的表单组件，支持设置成员角色、权限等信息。

> 具体 Props 和功能请参考组件源码 `components/members/MemberForm.tsx`。

## 使用示例

```tsx
import { MemberForm } from "@/components/members/MemberForm";

<MemberForm
  initialData={existingMember}
  onSubmit={handleMemberSave}
  onCancel={handleCancel}
/>
```

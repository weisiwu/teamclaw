# 11【P1】弹窗组件未统一使用 Dialog 组件

## 问题描述

项目中存在两种弹窗实现方式：
1. **UI 组件库 Dialog**：`components/ui/dialog.tsx`（基于 Radix UI 封装）
2. **手写 fixed 遮罩层**：手动组合 `fixed inset-0 z-50` + `bg-black/50` + 内容卡片

手写弹窗缺乏统一的动画、键盘交互（ESC 关闭）、焦点管理和无障碍属性，应统一迁移到 `<Dialog>` 组件。

## 受影响文件

### 1. `app/members/page.tsx`

三个手写弹窗：
- **删除确认弹窗**（line 557-585）：`fixed inset-0 z-50` + `bg-black/50` 遮罩
- **批量删除确认弹窗**（line 588-616）：同上
- **成员详情弹窗**（line 619-687）：同上

### 2. `app/cron/page.tsx`

两个手写弹窗：
- **CronModal 创建/编辑弹窗**（line 224-292）：`fixed inset-0 z-50` + `bg-black/50`
- **CronRunLogModal 日志弹窗**（line 310-367）：`fixed inset-0 z-50` + `bg-black/50`

> 注意：同文件中删除确认已正确使用 `<Dialog>` 组件（line 546-567），说明同一文件内风格不一致。

## 样式方案

**样式类型：组件替换 — 使用 `components/ui/dialog.tsx` 封装组件**

### 统一使用 Dialog 组件

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// 替换手写弹窗为：
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-sm">  {/* 或 max-w-md / max-w-lg */}
    <DialogHeader>
      <DialogTitle>确认删除</DialogTitle>
    </DialogHeader>
    <p className="text-sm text-muted-foreground py-4">
      确定要删除该成员吗？此操作不可撤销。
    </p>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>取消</Button>
      <Button variant="destructive" onClick={handleDelete}>删除</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Dialog 组件优势
- 自动管理 `z-index`、遮罩层、关闭动画
- 内置 ESC 键关闭、点击遮罩关闭
- 自动焦点捕获（focus trap）
- 无障碍属性（`role="dialog"`, `aria-modal`）

## 修改步骤

1. `app/members/page.tsx`：三个手写弹窗全部替换为 `<Dialog>` 组件
2. `app/cron/page.tsx`：`CronModal` 和 `CronRunLogModal` 替换为 `<Dialog>` 组件
3. 验证已有 `<Dialog>` 的页面（`versions`、`docs`、`cron` 删除确认）无需修改

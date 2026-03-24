# UI 组件库

> `components/ui/` — 基础 UI 组件

---

## Button

**文件**: `button.tsx`

### Props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}
```

### 变体

| variant | 说明 |
|---|---|
| `default` | 默认蓝色按钮 |
| `destructive` | 红色危险操作按钮 |
| `outline` | 描边按钮 |
| `secondary` | 次要按钮 |
| `ghost` | 幽灵按钮（透明背景） |
| `link` | 链接样式按钮 |

### 使用示例

```tsx
import { Button } from '@/components/ui/button';

// 默认
<Button>Click me</Button>

// 危险操作
<Button variant="destructive">删除</Button>

// 图标按钮
<Button size="icon"><TrashIcon /></Button>
```

---

## Card

**文件**: `card.tsx`

### Props

```typescript
// Card
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

// CardHeader
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

// CardContent
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

// CardTitle
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
```

### 使用示例

```tsx
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>版本信息</CardTitle>
  </CardHeader>
  <CardContent>
    <p>版本详情内容...</p>
  </CardContent>
</Card>
```

---

## Input

**文件**: `input.tsx`

### Props

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}
```

### 使用示例

```tsx
import { Input } from '@/components/ui/input';

<Input placeholder="请输入..." />
<Input error placeholder="错误状态" />
```

---

## Dialog

**文件**: `dialog.tsx`

### Props

```typescript
// Dialog
interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

// DialogContent
interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
}
```

### 使用示例

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>确认删除</DialogTitle>
      <DialogDescription>此操作无法撤销</DialogDescription>
    </DialogHeader>
    {/* 内容 */}
  </DialogContent>
</Dialog>
```

---

## Badge

**文件**: `badge.tsx`

### Props

```typescript
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}
```

### 使用示例

```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="default">进行中</Badge>
<Badge variant="destructive">失败</Badge>
<Badge variant="secondary">草稿</Badge>
```

---

## Select

**文件**: `select.tsx`

### Props

```typescript
interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
}
```

### 使用示例

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

<Select onValueChange={(v) => setValue(v)}>
  <SelectTrigger>
    <SelectValue placeholder="选择状态" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="active">活跃</SelectItem>
    <SelectItem value="inactive">停用</SelectItem>
  </SelectContent>
</Select>
```

---

## Tabs

**文件**: `tabs.tsx`

### Props

```typescript
// Tabs
interface TabsProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

// TabsContent
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}
```

### 使用示例

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="versions">
  <TabsList>
    <TabsTrigger value="versions">版本</TabsTrigger>
    <TabsTrigger value="branches">分支</TabsTrigger>
  </TabsList>
  <TabsContent value="versions">版本列表内容</TabsContent>
  <TabsContent value="branches">分支列表内容</TabsContent>
</Tabs>
```

---

## Progress

**文件**: `progress.tsx`

### Props

```typescript
interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
}
```

### 使用示例

```tsx
import { Progress } from '@/components/ui/progress';

<Progress value={60} max={100} />
```

---

## Switch

**文件**: `switch.tsx`

### Props

```typescript
interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}
```

### 使用示例

```tsx
import { Switch } from '@/components/ui/switch';

<Switch checked={enabled} onCheckedChange={setEnabled} />
```

---

## DropdownMenu

**文件**: `dropdown-menu.tsx`

### Props

```typescript
// DropdownMenu
interface DropdownMenuProps {
  children: React.ReactNode;
}

// DropdownMenuTrigger
interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

// DropdownMenuContent
interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

// DropdownMenuItem
interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  disabled?: boolean;
}

// DropdownMenuSeparator
interface DropdownMenuSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}
```

### 使用示例

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">操作</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>编辑</DropdownMenuItem>
    <DropdownMenuItem>复制</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem destructive>删除</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Toast

**文件**: `toast.tsx`

### 使用方式

通过 `useToast` hook 使用：

```tsx
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();

toast({
  title: '操作成功',
  description: '版本已发布',
  variant: 'default', // 或 'destructive'
});
```

---

## EmptyState

**文件**: `empty-state.tsx`

### Props

```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
```

### 使用示例

```tsx
import { EmptyState } from '@/components/ui/empty-state';

<EmptyState
  icon={<FolderOpenIcon />}
  title="暂无版本"
  description="创建您的第一个版本"
  action={<Button>创建版本</Button>}
/>
```

---

## ErrorBoundary

**文件**: `error-boundary.tsx`

### Props

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
```

### 使用示例

```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary';

<ErrorBoundary
  fallback={<div>出错了</div>}
>
  <MyComponent />
</ErrorBoundary>
```

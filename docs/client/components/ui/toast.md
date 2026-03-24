# Toast 组件

## 功能说明

轻量级通知提示组件，用于显示操作反馈信息。

## 引入

```tsx
import { useToast } from '@/hooks/use-toast'; // 或直接使用 Toast 组件
```

## 使用示例

```tsx
const { toast } = useToast();

toast({
  title: '保存成功',
  description: '您的更改已保存',
});

// 错误提示
toast({
  title: '操作失败',
  description: '请稍后重试',
  variant: 'destructive',
});
```

## Toast Variants

- **default**: 默认提示
- **destructive**: 错误/危险操作提示

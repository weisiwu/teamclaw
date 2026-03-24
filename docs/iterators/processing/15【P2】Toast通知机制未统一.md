# 15【P2】Toast 通知机制未统一

## 问题描述

项目中存在两套 Toast 通知实现：
1. **全局 ToastProvider**：`components/ui/toast.tsx` 提供的上下文通知系统，已在 `AppLayout` 中挂载
2. **手写内联 Toast**：`app/tokens/page.tsx` 中自行实现的 `useState` + `setTimeout` 方案

手写方案存在以下问题：
- 代码冗余（约 30 行额外状态管理代码）
- 位置、动画与全局 Toast 不一致
- 无法被其他组件复用
- 状态管理散落在业务逻辑中

## 受影响文件

### `app/tokens/page.tsx`（line 64-79, 214-229）

```tsx
// 手写 Toast 状态（line 64-79）
const [toastMsg, setToastMsg] = useState("");
const [toastType, setToastType] = useState<"success" | "error">("success");
const [toastVisible, setToastVisible] = useState(false);

const showToast = (msg: string, type: "success" | "error" = "success") => {
  setToastMsg(msg);
  setToastType(type);
  setToastVisible(true);
};

useEffect(() => {
  if (toastVisible) {
    const timer = setTimeout(() => setToastVisible(false), 2500);
    return () => clearTimeout(timer);
  }
}, [toastVisible]);

// 手写 Toast 渲染（line 214-229）
{toastVisible && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] ...">
    ...
  </div>
)}
```

## 样式方案

**样式类型：组件替换 — 使用已有的 `ToastProvider` 上下文**

### 替换方案

已有的 `components/ui/toast.tsx` 提供了 `useToast()` Hook：

```tsx
import { useToast } from '@/components/ui/toast';

function TokensContent() {
  const { showToast } = useToast();

  const handleExport = () => {
    if (!exportData || exportData.length === 0) {
      showToast("暂无数据可导出", "error");
      return;
    }
    // ... export logic
    showToast("导出成功", "success");
  };
}
```

### 修改步骤

1. 删除 `app/tokens/page.tsx` 中的 `toastMsg`、`toastType`、`toastVisible` 状态
2. 删除 `showToast` 函数定义和 `useEffect` 清理逻辑
3. 删除 JSX 中手写 Toast 渲染块
4. 引入 `useToast()` Hook
5. 替换调用为 `showToast(msg, type)`

## 修改范围

- `app/tokens/page.tsx` — 删除手写 Toast，改用 `useToast()` Hook

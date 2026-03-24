# ThemeProvider

主题（亮色/暗色）Provider，基于 `next-themes` 实现。

## 导入

```tsx
import { ThemeProvider } from "@/components/theme/ThemeProvider";
```

## 使用

```tsx
// app/layout.tsx
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## next-themes 配置

| 配置 | 说明 |
|------|------|
| `attribute="class"` | 通过 CSS class 切换主题 |
| `defaultTheme="system"` | 跟随系统主题 |
| `enableSystem` | 支持系统主题选项 |

## 主题切换

通常在设置页面配合 `useTheme()` hook 使用：

```tsx
import { useTheme } from "next-themes";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">浅色</option>
      <option value="dark">深色</option>
      <option value="system">跟随系统</option>
    </select>
  );
}
```

## 注意事项

- 根元素 `<html>` 需加 `suppressHydrationWarning` 防止 SSR 水合不匹配警告
- 组件内部使用 `dark:` 前缀的 Tailwind 类实现深色模式适配

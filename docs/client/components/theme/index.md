# Theme 组件

## 目录

`components/theme/`

| 组件          | 说明         |
| ------------- | ------------ |
| ThemeProvider | 主题Provider |

## ThemeProvider

全局主题 Provider，管理暗色/亮色模式。

```tsx
import { ThemeProvider } from '@/components/theme/ThemeProvider';

<ThemeProvider>
  <App />
</ThemeProvider>;
```

## 暗色模式

通过 `class="dark"` 或 Tailwind CSS 的暗色模式类实现自动切换。

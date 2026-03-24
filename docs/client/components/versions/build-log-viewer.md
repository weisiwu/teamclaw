# BuildLogViewer 组件

## 功能说明

构建日志查看器组件，支持实时日志流和历史日志查看。

## 引入

```tsx
import { BuildLogViewer } from '@/components/versions/BuildLogViewer';
```

## 位置

`components/versions/BuildLogViewer.tsx`

## Props

| 属性       | 类型      | 说明               |
| ---------- | --------- | ------------------ |
| buildId    | `string`  | 构建 ID            |
| autoScroll | `boolean` | 是否自动滚动到底部 |
| maxLines   | `number`  | 最大显示行数       |

## 功能特性

- ANSI 颜色代码解析
- 自动滚动跟随
- 日志搜索
- 复制日志内容
- 错误行高亮

## 使用示例

```tsx
<BuildLogViewer buildId={currentBuild.id} autoScroll={true} maxLines={1000} />
```

# DocSearchBox & DocViewer

文档搜索和阅读组件（文档中心页面使用）。

## 导入

```tsx
import { DocSearchBox } from "@/components/DocSearchBox";
import { DocViewer } from "@/components/DocViewer";
```

## DocSearchBox

文档搜索输入框。

```tsx
interface DocSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}
```

```tsx
// 使用示例
<DocSearchBox
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="搜索文档标题或内容..."
/>
```

## DocViewer

文档内容阅读/渲染组件。

```tsx
interface DocViewerProps {
  content: string;           // Markdown 或 HTML 内容
  className?: string;
}
```

```tsx
// 使用示例
<DocViewer content={docContent} />
```

具体功能取决于组件内部实现（通常支持 Markdown 渲染、代码高亮、目录导航等）。

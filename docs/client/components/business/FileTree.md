# FileTree

文件树组件（文档中心/项目文件浏览）。

## 导入

```tsx
import { FileTree } from "@/components/FileTree";
```

## Props

```tsx
interface FileTreeProps {
  files: FileNode[];        // 文件树数据
  onFileClick?: (file: FileNode) => void;  // 文件点击回调
  selectedId?: string;      // 当前选中的文件 ID
  className?: string;
}

interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  path?: string;
}
```

## 使用示例

```tsx
import { FileTree } from "@/components/FileTree";

const fileTree: FileNode[] = [
  {
    id: "1",
    name: "src",
    type: "folder",
    children: [
      { id: "2", name: "index.ts", type: "file" },
      { id: "3", name: "App.tsx", type: "file" },
    ],
  },
  { id: "4", name: "package.json", type: "file" },
];

<FileTree files={fileTree} onFileClick={(file) => openFile(file)} />
```

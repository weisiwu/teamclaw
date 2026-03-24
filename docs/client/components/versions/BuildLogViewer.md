# BuildLogViewer

构建日志查看器，支持日志展开/折叠、过滤、复制。

## 导入

```tsx
import { BuildLogViewer, getBuildHistory, addBuildLog, updateBuildLog, clearBuildHistory } from "@/components/versions/BuildLogViewer";
```

## Props

```tsx
interface BuildLogViewerProps {
  buildLogs: BuildLog[];    // 构建日志列表
  onClear?: () => void;    // 清空记录回调
}
```

## BuildLog 类型

```tsx
interface BuildLog {
  id: string;
  versionName: string;
  buildId: string;
  startTime: Date;
  endTime?: Date;
  status: "success" | "failed" | "building";
  logs: string[];   // 日志行数组
}
```

## Hook API

| 函数 | 描述 |
|------|------|
| `getBuildHistory()` | 从 localStorage 读取历史记录 |
| `addBuildLog(log)` | 添加新记录，返回带 ID 的 BuildLog |
| `updateBuildLog(id, updates)` | 更新指定记录 |
| `clearBuildHistory()` | 清空所有历史 |

## 使用示例

```tsx
import { BuildLogViewer } from "@/components/versions/BuildLogViewer";

function BuildLogs() {
  const [logs, setLogs] = useState<BuildLog[]>([]);

  useEffect(() => {
    setLogs(getBuildHistory());
  }, []);

  return (
    <BuildLogViewer
      buildLogs={logs}
      onClear={clearBuildHistory}
    />
  );
}
```

## 交互功能

- **过滤按钮**：全部 / 成功 / 失败
- **展开/折叠**：点击日志卡片头部展开详情
- **复制日志**：「📋 复制日志」按钮
- **重新构建**：「🔄 重新构建」按钮，触发 `window` 自定义事件
- **Escape 键**：折叠当前展开的日志

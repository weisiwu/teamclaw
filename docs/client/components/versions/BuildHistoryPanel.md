# BuildHistoryPanel

构建历史面板，展示版本的所有构建记录，支持触发构建、重新构建、取消构建。

## 导入

```tsx
import { BuildHistoryPanel } from "@/components/versions/BuildHistoryPanel";
```

## Props

```tsx
interface BuildHistoryPanelProps {
  versionId: string;
  versionName: string;
  versionNumber: string;
  projectPath?: string;
  onBuildTriggered?: (buildId: string) => void;
}
```

## 功能

1. **一键打包** — 触发新的构建
2. **构建历史列表** — 每条记录可展开查看产物
3. **重新打包** — 基于已有构建配置重新构建
4. **取消构建** — 取消正在排队/构建中的任务
5. **打包下载** — 为特定构建创建 zip 包

## 构建状态

| status | 图标 | 含义 |
|--------|------|------|
| `success` | ✅ `CheckCircle2` | 构建成功 |
| `failed` | ❌ `XCircle` | 构建失败 |
| `building` | 🔄 `Loader2` | 构建中（旋转） |
| `pending` | ⏰ `Clock` | 排队中 |
| `cancelled` | — `X` | 已取消 |

## 统计栏

- **总构建次数**
- **成功 / 失败计数**（带颜色图标）
- **成功率百分比**
- **平均构建时长**
- **最后构建时间**

## 产物下载

展开构建记录后可：
- 按文件下载（根据扩展名显示不同图标）
- 打包下载（zip）
- 查看全部产物链接

## 使用示例

```tsx
<BuildHistoryPanel
  versionId="v_abc123"
  versionName="v1.2.3"
  versionNumber="1.2.3"
  projectPath="/path/to/project"
  onBuildTriggered={(buildId) => console.log('Build started:', buildId)}
/>
```

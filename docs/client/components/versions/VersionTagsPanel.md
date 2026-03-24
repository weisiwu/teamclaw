# VersionTagsPanel

版本标签（Git Tag）管理面板，支持按时间分组浏览、搜索、排序、筛选。

## 导入

```tsx
import { VersionTagsPanel } from "@/components/versions/VersionTagsPanel";
```

## 功能

1. **按时间分组**：「本周」/「本月」/「更早」
2. **搜索**：按 Tag 名、作者、提交信息、Commit Hash 搜索
3. **排序**：按日期（升/降）或 Semver 版本号排序
4. **状态筛选**：全部 / 已发布 / 构建成功 / 构建失败 / 有截图 / 有变更日志
5. **快速升级**：输入任务 ID 和版本 ID，触发自动升级
6. **Tag 分组管理**（通过 `TagGroupManager`）
7. **详情抽屉**：点击 Tag 打开 `VersionTagsDetailDrawer`
8. **回退**：点击 Tag 的回退按钮打开 `RollbackDialog`

## 使用示例

```tsx
import { VersionTagsPanel } from "@/components/versions/VersionTagsPanel";

export default function TagsPage() {
  return (
    <div className="h-full">
      <VersionTagsPanel />
    </div>
  );
}
```

## 时间分组导航

滚动时自动检测当前停留的时间段，对应 Tab 高亮。点击 Tab 可快速滚动到对应分组。

## Semver 排序

```tsx
// v1.2.3 → [1, 2, 3]
// v1.10.0 → [1, 10, 0]
// 自动处理 v 前缀
function semverCompare(a, b, desc) {
  // 逐段比较，不按字符串字典序
}
```

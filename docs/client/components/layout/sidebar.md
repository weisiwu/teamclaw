# Sidebar

侧边导航栏组件，支持折叠/展开功能。

## 导入

```tsx
import { Sidebar } from "@/components/layout/Sidebar";
```

## Props

```tsx
interface SidebarProps {
  onNavigate?: () => void;       // 链接点击后回调（用于关闭移动端抽屉）
  collapsed?: boolean;          // 是否折叠状态
  onToggleCollapse?: () => void; // 切换折叠回调
}
```

## 导航项

```tsx
const menuItems = [
  { href: "/", label: "控制台", icon: Home },
  { href: "/import", label: "项目导入", icon: FolderPlus },
  { href: "/tasks", label: "任务管理", icon: Layers },
  { href: "/versions", label: "版本管理", icon: GitBranch },
  { href: "/branches", label: "分支管理", icon: GitBranch },
  { href: "/agent-team", label: "Agent 团队", icon: Bot },
  { href: "/capabilities", label: "能力配置", icon: Zap },
  { href: "/cron", label: "定时任务", icon: Clock },
  { href: "/docs", label: "文档中心", icon: FileText },
  { href: "/tokens", label: "Token 管理", icon: Key },
  { href: "/members", label: "成员管理", icon: Users },
];
```

## 使用示例

```tsx
function AppShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex">
      <Sidebar 
        collapsed={collapsed} 
        onToggleCollapse={() => setCollapsed(c => !c)} 
      />
      <main className="flex-1">
        {/* 页面内容 */}
      </main>
    </div>
  );
}
```

## 设计细节

- **展开宽度**：`w-64`（256px）
- **折叠宽度**：`w-16`（64px）
- **折叠时**：文字隐藏（`opacity-0 w-0 overflow-hidden`），图标仍显示
- **活跃状态**：蓝色背景 `bg-blue-50`，蓝色文字
- **活跃指示点**：折叠状态下活跃项右侧显示小蓝点
- **过渡动画**：`transition-all duration-300`

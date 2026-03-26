"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Layers, 
  GitBranch, 
  Key, 
  Users,
  Settings,
  FolderPlus,
  Bot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/import", label: "项目导入", icon: FolderPlus },
  { href: "/tasks", label: "任务管理", icon: Layers },
  { href: "/versions", label: "版本管理", icon: GitBranch },
  { href: "/agent-team", label: "Agent 团队", icon: Bot },
  { href: "/tokens", label: "Token 管理", icon: Key },
  { href: "/members", label: "成员管理", icon: Users },
  { href: "/settings", label: "设置", icon: Settings },
];

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  const handleLinkClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <aside
      className={cn(
        "h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] border-r flex flex-col overflow-hidden transition-all duration-300",
        "bg-white dark:bg-slate-800/80 dark:border-slate-700/60",
        collapsed ? "w-16" : "w-64",
        // R12 视觉升级：渐变与玻璃拟态
        "bg-gradient-to-br from-white via-white to-slate-50",
        "dark:from-slate-900 dark:via-slate-800/95 dark:to-slate-900/90",
        "dark:backdrop-blur-md"
      )}
    >
      <nav className="flex-1 p-2 sm:p-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "group flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                collapsed && "justify-center",
                isActive
                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
                  : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/70"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon 
                className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-200"
                )} 
              />
              <span 
                className={cn(
                  "sidebar-label whitespace-nowrap transition-all duration-300",
                  collapsed && "opacity-0 w-0 overflow-hidden"
                )}
              >
                {item.label}
              </span>
              {/* Active indicator dot for collapsed state */}
              {isActive && collapsed && (
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* Collapse toggle button */}
      {onToggleCollapse && (
        <div className={cn(
          "p-2 sm:p-3 border-t border-gray-200 dark:border-slate-700",
          collapsed && "flex justify-center"
        )}>
          {collapsed ? (
            <button
              onClick={onToggleCollapse}
              className="w-full flex justify-center p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title="展开侧边栏"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title="折叠侧边栏"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>折叠</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

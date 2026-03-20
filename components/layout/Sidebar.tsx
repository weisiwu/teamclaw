"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Layers, 
  GitBranch, 
  Zap, 
  Clock, 
  FileText, 
  Key, 
  Users,
  Home,
  Settings,
  FolderPlus,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/", label: "控制台", icon: Home },
  { href: "/import", label: "项目导入", icon: FolderPlus },
  { href: "/tasks", label: "任务管理", icon: Layers },
  { href: "/versions", label: "版本管理", icon: GitBranch },
  { href: "/versions/panel", label: "版本面板", icon: GitBranch },
  { href: "/branches", label: "分支管理", icon: GitBranch },
  { href: "/agent-team", label: "Agent 团队", icon: Bot },
  { href: "/capabilities", label: "能力配置", icon: Zap },
  { href: "/cron", label: "定时任务", icon: Clock },
  { href: "/docs", label: "文档中心", icon: FileText },
  { href: "/tokens", label: "Token 管理", icon: Key },
  { href: "/members", label: "成员管理", icon: Users },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const handleLinkClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <aside className="w-64 h-[calc(100vh-4rem)] border-r bg-white dark:bg-slate-800 dark:border-slate-700 flex flex-col overflow-y-auto">
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-slate-700">
        <Link
          href="/settings"
          onClick={handleLinkClick}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <Settings className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          设置
        </Link>
      </div>
    </aside>
  );
}

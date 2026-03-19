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
  { href: "/agent-team", label: "Agent 团队", icon: Bot },
  { href: "/capabilities", label: "能力配置", icon: Zap },
  { href: "/cron", label: "定时任务", icon: Clock },
  { href: "/docs", label: "文档中心", icon: FileText },
  { href: "/tokens", label: "Token 管理", icon: Key },
  { href: "/members", label: "成员管理", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-[calc(100vh-4rem)] border-r bg-gray-50 hidden lg:flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-gray-500")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Settings className="w-5 h-5 text-gray-500" />
          设置
        </Link>
      </div>
    </aside>
  );
}

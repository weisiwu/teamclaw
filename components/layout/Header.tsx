import { Menu, Bell, User } from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-14 sm:h-16 border-b bg-white dark:bg-slate-800 dark:border-slate-700 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="打开菜单"
        >
          <Menu className="w-5 h-5 text-gray-700 dark:text-slate-200" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">TeamClaw</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-lg relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="flex items-center gap-2 pl-4 border-l">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium">管理员</span>
        </div>
      </div>
    </header>
  );
}

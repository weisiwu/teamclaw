"use client";

import { Menu, Bell, User } from "lucide-react";
import { Breadcrumb } from "./Breadcrumb";

interface HeaderProps {
  onMenuClick?: () => void;
  showBreadcrumb?: boolean;
}

export function Header({ onMenuClick, showBreadcrumb = true }: HeaderProps) {
  return (
    <header className="h-14 sm:h-16 border-b bg-white/80 dark:bg-slate-900/80 dark:border-slate-700/60 backdrop-blur-md flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="打开菜单"
        >
          <Menu className="w-5 h-5 text-gray-700 dark:text-slate-200" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">TeamClaw</h1>
        {showBreadcrumb && (
          <div className="hidden md:block ml-4">
            <Breadcrumb />
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg relative transition-colors duration-150">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse-dot"></span>
        </button>
        <div className="flex items-center gap-2 pl-4 border-l">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium hidden sm:block">管理员</span>
        </div>
      </div>
    </header>
  );
}

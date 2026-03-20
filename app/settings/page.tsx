'use client';

import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun, Users, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TeamSettings } from '@/components/team/TeamSettings';
import { Role } from '@/lib/auth/roles';

export default function Settings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 当前用户角色（mock，真实场景从 auth context 获取）
  const [currentUserRole] = useState<Role>('admin');
  const [activeSection, setActiveSection] = useState<'appearance' | 'team'>('appearance');

  if (!mounted) {
    return (
      <div className="page-container">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">设置</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">系统配置与管理</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const themes = [
    { value: 'light', label: '浅色', icon: Sun, description: '明亮主题' },
    { value: 'dark', label: '深色', icon: Moon, description: '暗黑主题' },
    { value: 'system', label: '跟随系统', icon: Monitor, description: '自动匹配设备设置' },
  ];

  const sections = [
    { id: 'appearance', label: '外观设置', icon: Monitor },
    { id: 'team', label: '团队管理', icon: Users },
  ];

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* 侧边栏 */}
      <div className="w-48 shrink-0">
        <nav className="space-y-1">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id as 'appearance' | 'team')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeSection === s.id
                    ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
                <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
              </button>
            );
          })}
        </nav>
      </div>

      {/* 内容区 */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">设置</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">系统配置与团队管理</p>
        </div>
        {activeSection === 'appearance' && (
          <>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          外观设置
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          选择您喜欢的主题模式
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = (theme === t.value) ||
              (t.value === 'system' && !theme) ||
              (resolvedTheme === t.value && t.value !== 'system');

            return (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`
                  flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all
                  ${isActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`} />
                <div className="text-center">
                  <div className={`font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                    {t.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                当前主题
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {resolvedTheme === 'dark' ? '深色模式' : resolvedTheme === 'light' ? '浅色模式' : '跟随系统'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {resolvedTheme === 'dark' ? '🌙' : resolvedTheme === 'light' ? '☀️' : '💻'}
              </span>
            </div>
          </div>
        </div>
          </>
        )}

        {activeSection === 'team' && (
          <TeamSettings currentUserRole={currentUserRole} />
        )}
      </div>
    </div>
  );
}

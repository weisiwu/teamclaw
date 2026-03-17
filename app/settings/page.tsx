'use client';

import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Settings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-6 space-y-6">
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">设置</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">系统配置与管理</p>
      </div>

      {/* 主题设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
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
      </div>

      {/* 其他设置占位 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          其他设置
        </h2>
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          更多设置功能开发中...
        </div>
      </div>
    </div>
  );
}

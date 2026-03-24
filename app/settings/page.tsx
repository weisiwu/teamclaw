'use client';

import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun, Users, ChevronRight, Gamepad2, RefreshCw, Trash2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TeamSettings } from '@/components/team/TeamSettings';
import { useAuth } from '@/lib/hooks/useAuth';
import type { Role } from '@/lib/auth/roles';

interface DemoStatus {
  seeded: boolean;
  counts: {
    projects?: number;
    tasks?: number;
    versions?: number;
    messages?: number;
    tags?: number;
  };
}

export default function Settings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentUserRole = (user?.role as Role) ?? 'member';
  const [activeSection, setActiveSection] = useState<'appearance' | 'team' | 'demo'>('appearance');

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
    { id: 'demo', label: 'Demo 数据', icon: Gamepad2 },
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
                onClick={() => setActiveSection(s.id as 'appearance' | 'team' | 'demo')}
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

        {activeSection === 'demo' && (
          <DemoDataManagement />
        )}
      </div>
    </div>
  );
}

// ============ Demo Data Management Component ============

function DemoDataManagement() {
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'seed' | 'clear' | null>(null);
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/demo/status', { credentials: 'include' });
      const json = await res.json();
      if (json.code === 200) {
        setStatus(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch demo status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSeed = async () => {
    setActionLoading('seed');
    setActionResult(null);
    try {
      const res = await fetch('/api/v1/admin/demo/seed', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.code === 200) {
        setActionResult({ type: 'success', message: json.data.seeded ? 'Demo 数据加载成功！' : 'Demo 数据已存在，无需重复加载。' });
        await fetchStatus();
      } else {
        setActionResult({ type: 'error', message: json.message || '加载失败' });
      }
    } catch (err) {
      setActionResult({ type: 'error', message: (err as Error).message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleClear = async () => {
    if (!confirm('确定要清除所有 Demo 数据吗？此操作不可恢复！')) return;
    setActionLoading('clear');
    setActionResult(null);
    try {
      const res = await fetch('/api/v1/admin/demo/clear', {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.code === 200) {
        setActionResult({ type: 'success', message: 'Demo 数据已清除！' });
        await fetchStatus();
      } else {
        setActionResult({ type: 'error', message: json.message || '清除失败' });
      }
    } catch (err) {
      setActionResult({ type: 'error', message: (err as Error).message });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        🎮 Demo 数据管理
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        以 TeamClaw 自身作为示例项目，预置完整的 Demo 数据（任务、版本、消息、标签），方便快速了解系统功能。
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">加载中...</span>
        </div>
      ) : status ? (
        <>
          {/* 状态卡片 */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {status.seeded ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                )}
                <span className={`text-sm font-medium ${status.seeded ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  状态: {status.seeded ? '✅ 已加载' : '⚠️ 未加载'}
                </span>
              </div>
            </div>

            {status.seeded && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: '项目', value: status.counts.projects ?? 0 },
                  { label: '任务', value: status.counts.tasks ?? 0 },
                  { label: '版本', value: status.counts.versions ?? 0 },
                  { label: '消息', value: status.counts.messages ?? 0 },
                ].map((item) => (
                  <div key={item.label} className="bg-white/60 dark:bg-gray-800/60 rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={handleSeed}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {actionLoading === 'seed' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {actionLoading === 'seed' ? '加载中...' : '重新加载 Demo 数据'}
            </button>

            {status.seeded && (
              <button
                onClick={handleClear}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 disabled:bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200 transition-colors"
              >
                {actionLoading === 'clear' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {actionLoading === 'clear' ? '清除中...' : '清除 Demo 数据'}
              </button>
            )}
          </div>

          {actionResult && (
            <div className={`text-sm px-4 py-3 rounded-lg mb-4 ${
              actionResult.type === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            }`}>
              {actionResult.message}
            </div>
          )}

          {/* 警告提示 */}
          <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span>清除后 Demo 数据不可恢复。生产环境部署时请务必清除 Demo 数据。</span>
          </div>
        </>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">加载状态失败</div>
      )}
    </div>
  );
}

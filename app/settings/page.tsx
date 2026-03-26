'use client';

import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun, Users, ChevronRight, Gamepad2, RefreshCw, Trash2, AlertTriangle, CheckCircle2, Loader2, Shield, Webhook as WebhookIcon, Clock, Search, Download, Badge, Input as InputLucide, LegacySelect, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Button as ButtonLucide, PauseCircle, PlayCircle } from 'lucide-react';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TeamSettings } from '@/components/team/TeamSettings';
import { useAuth } from '@/lib/hooks/useAuth';
import type { Role } from '@/lib/auth/roles';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-safe-fetch';
import { useApiError } from '@/hooks/useApiError';
import type { SystemConfig } from '@/lib/api/adminConfig';
import type { AuditLog } from '@/lib/api/auditLogs';
import type { Webhook, WebhookHistory } from '@/lib/api/webhooks';
import { useCronList, useStartCron, useStopCron } from '@/hooks/useCron';
import { CRON_STATUS_LABELS, CRON_STATUS_BADGE_VARIANT } from '@/lib/api/constants';

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
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (tabParam) {
      const validTabs = ['appearance', 'system', 'audit', 'webhooks', 'cron', 'team', 'demo'];
      if (validTabs.includes(tabParam)) {
        setActiveSection(tabParam as typeof activeSection);
      }
    }
  }, [tabParam]);

  const currentUserRole = (user?.role as Role) ?? 'member';
  const [activeSection, setActiveSection] = useState<'appearance' | 'system' | 'audit' | 'webhooks' | 'cron' | 'team' | 'demo'>('appearance');

  if (!mounted) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-header-title">设置</h1>
          <p className="page-header-subtitle">系统配置与管理</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded-lg"></div>
          <div className="h-20 bg-muted rounded-lg"></div>
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
    { id: 'system', label: '系统配置', icon: Shield },
    { id: 'audit', label: '审计日志', icon: Search },
    { id: 'webhooks', label: 'Webhook', icon: WebhookIcon },
    { id: 'cron', label: '定时任务', icon: Clock },
    { id: 'team', label: '团队管理', icon: Users },
    { id: 'demo', label: 'Demo 数据', icon: Gamepad2 },
  ];

  return (
    <div className="page-container">
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* 侧边栏 */}
      <div className="w-48 shrink-0">
        <nav className="space-y-1">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id as 'appearance' | 'system' | 'audit' | 'webhooks' | 'cron' | 'team' | 'demo')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeSection === s.id
                    ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'
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
        <div className="page-header">
          <h1 className="page-header-title">设置</h1>
          <p className="page-header-subtitle">系统配置与团队管理</p>
        </div>

        {activeSection === 'system' && (
          <SystemConfigPanel />
        )}

        {activeSection === 'audit' && (
          <AuditLogPanel />
        )}

        {activeSection === 'webhooks' && (
          <WebhooksPanel />
        )}

        {activeSection === 'cron' && (
          <CronPanel />
        )}

        {activeSection === 'appearance' && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              外观设置
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
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
                        : 'border-border hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <Icon className={`w-6 h-6 ${isActive ? 'text-blue-500' : 'text-muted-foreground'}`} />
                    <div className="text-center">
                      <div className={`font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                        {t.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    当前主题
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {resolvedTheme === 'dark' ? '深色模式' : resolvedTheme === 'light' ? '浅色模式' : '跟随系统'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
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
    </div>
  );
}

// ============ System Config Panel (from /admin/config) ============

function SystemConfigPanel() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'llm' | 'features' | 'security' | 'permissions'>('llm');
  const [abilities, setAbilities] = useState<Array<{ id: string; name: string; description: string; enabled: boolean; requiredRole: string }>>([]);
  const [abilitiesLoading, setAbilitiesLoading] = useState(false);
  const { showError } = useApiError();

  useEffect(() => {
    loadConfig();
    loadAbilities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const result = await apiGet<SystemConfig>('/api/v1/admin/config');
      if (result.success && result.data) setConfig(result.data);
      else if (result.error) showError(result.error, '加载系统配置失败');
    } catch (err) {
      showError(err, '加载系统配置失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAbilities = async () => {
    try {
      setAbilitiesLoading(true);
      const result = await apiGet<Array<{ id: string; name: string; description: string; enabled: boolean; requiredRole: string }>>('/api/v1/admin/config/abilities');
      if (result.success && result.data) setAbilities(result.data);
    } catch (err) {
      showError(err, '加载功能开关失败');
    } finally {
      setAbilitiesLoading(false);
    }
  };

  const saveConfig = async (updates: Partial<SystemConfig>) => {
    try {
      setSaving(true);
      const merged = { ...config, ...updates } as SystemConfig;
      const result = await apiPut('/api/v1/admin/config', merged);
      if (result.success) {
        setConfig(merged);
      } else if (result.error) {
        showError(result.error, '保存配置失败');
      }
    } catch (err) {
      showError(err, '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleAbility = async (id: string, enabled: boolean) => {
    try {
      const result = await apiPut(`/api/v1/admin/config/abilities/${id}`, { enabled });
      if (result.success) {
        setAbilities(prev => prev.map(a => a.id === id ? { ...a, enabled } : a));
      } else if (result.error) {
        showError(result.error, '切换功能开关失败');
      }
    } catch (err) {
      showError(err, '切换功能开关失败');
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /><span>加载中...</span></div>;

  const subTabs = [
    { id: 'llm', label: 'LLM 配置' },
    { id: 'features', label: '功能开关' },
    { id: 'security', label: '安全设置' },
    { id: 'permissions', label: '权限配置' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">🛡️ 系统配置</h2>
      <p className="text-sm text-muted-foreground mb-6">配置 LLM、功能开关、安全和权限设置</p>

      <div className="flex gap-6 min-h-[calc(100vh-16rem)]">
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {subTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {tab.label}
                <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 space-y-4">
          {activeTab === 'llm' && config && (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
                <p className="text-blue-800 dark:text-blue-200">
                  <strong>当前 LLM 提供商：</strong>{config.llm?.provider ?? '未配置'}
                </p>
              </div>
              {config.llm && Object.entries(config.llm).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-foreground mb-1">{key}</label>
                  <input
                    type="text"
                    value={String(value ?? '')}
                    onChange={(e) => saveConfig({ llm: { ...config.llm!, [key]: e.target.value } })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm"
                  />
                </div>
              ))}
              <button
                onClick={() => saveConfig(config!)}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg"
              >
                {saving ? '保存中...' : '保存 LLM 配置'}
              </button>
            </>
          )}

          {activeTab === 'features' && (
            <>
              <p className="text-sm text-muted-foreground mb-4">管理功能开关</p>
              {abilitiesLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /><span>加载中...</span></div>
              ) : (
                <div className="space-y-2">
                  {abilities.map(ability => (
                    <div key={ability.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-foreground">{ability.name}</div>
                        <div className="text-xs text-muted-foreground">{ability.description}</div>
                      </div>
                      <button
                        onClick={() => toggleAbility(ability.id, !ability.enabled)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          ability.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {ability.enabled ? '已启用' : '已禁用'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'security' && config?.security && (
            <div className="space-y-4">
              {Object.entries(config.security).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-foreground mb-1">{key}</label>
                  <input
                    type="text"
                    value={String(value ?? '')}
                    onChange={(e) => saveConfig({ security: { ...config.security!, [key]: e.target.value } })}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm"
                  />
                </div>
              ))}
              <button
                onClick={() => saveConfig(config!)}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg"
              >
                {saving ? '保存中...' : '保存安全设置'}
              </button>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="text-sm text-muted-foreground">
              <p>权限配置面板 — 团队成员权限管理</p>
              <p className="mt-2 text-xs">如需管理成员权限，请前往「团队管理」标签页。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Audit Log Panel (from /admin/audit) ============

function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('');
  const { showError } = useApiError();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadLogs(); }, [page, actionType]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set('search', search);
      if (actionType) params.set('actionType', actionType);
      const result = await apiGet<{ data: AuditLog[]; total: number }>(`/api/v1/admin/audit?${params}`);
      if (result.success && result.data) {
        setLogs(result.data.data || []);
        setTotal(result.data.total || 0);
      } else if (result.error) {
        showError(result.error, '加载审计日志失败');
      }
    } catch (err) {
      showError(err, '加载审计日志失败');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (actionType) params.set('actionType', actionType);
      const result = await apiGet(`/api/v1/admin/audit/export?${params}`);
      if (result.success) {
        const blob = new Blob([result.data as string], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      }
    } catch (err) {
      showError(err, '导出失败');
    }
  };

  const ACTION_TYPE_OPTIONS = [
    { value: '', label: '全部操作' },
    { value: 'user.login', label: '用户登录' },
    { value: 'user.logout', label: '用户登出' },
    { value: 'config.change', label: '配置变更' },
    { value: 'cron.trigger', label: '定时任务触发' },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">📋 审计日志</h2>
      <p className="text-sm text-muted-foreground mb-6">记录系统中所有重要操作</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <InputLucide
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索用户或操作..."
          className="w-64"
          onKeyDown={(e) => e.key === 'Enter' && (loadLogs(), setPage(1))}
        />
        <LegacySelect
          value={actionType}
          onValueChange={(v) => { setActionType(v); setPage(1); }}
          options={ACTION_TYPE_OPTIONS}
          className="w-auto min-w-[140px]"
        />
        <ButtonLucide variant="outline" size="sm" onClick={() => { loadLogs(); setPage(1); }}>
          <Search className="w-4 h-4 mr-1" /> 搜索
        </ButtonLucide>
        <ButtonLucide variant="outline" size="sm" onClick={exportCsv}>
          <Download className="w-4 h-4 mr-1" /> 导出 CSV
        </ButtonLucide>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /><span>加载中...</span></div>
        ) : logs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">暂无审计日志</div>
        ) : (
          logs.map(log => (
            <Card key={log.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{log.actionType}</Badge>
                    <span className="text-xs text-muted-foreground">{log.createdAt}</span>
                  </div>
                  <p className="text-sm text-foreground">{log.description}</p>
                  {log.metadata && Object.entries(log.metadata).map(([k, v]) => (
                    <span key={k} className="text-xs text-muted-foreground mr-3">{k}: {String(v)}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {total > pageSize && (
        <div className="flex justify-center gap-2 mt-4">
          <ButtonLucide variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>上一页</ButtonLucide>
          <span className="text-sm text-muted-foreground px-3 py-2">第 {page} / {Math.ceil(total / pageSize)} 页</span>
          <ButtonLucide variant="outline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}>下一页</ButtonLucide>
        </div>
      )}
    </div>
  );
}

// ============ Webhooks Panel (from /admin/webhooks) ============

function WebhooksPanel() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggleId, setToggleId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, WebhookHistory[]>>({});
  const [showHistoryId, setShowHistoryId] = useState<string | null>(null);
  const { showError } = useApiError();

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiGet<Webhook[]>('/api/v1/admin/webhooks');
      if (result.success && result.data) setWebhooks(result.data);
      else if (result.error) showError(result.error, '加载 Webhook 失败');
    } catch (err) {
      showError(err, '加载 Webhook 失败');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const toggleWebhook = async (id: string, enabled: boolean) => {
    setToggleId(id);
    try {
      const result = await apiPut(`/api/v1/admin/webhooks/${id}`, { enabled });
      if (result.success) {
        setWebhooks(prev => prev.map(w => w.id === id ? { ...w, enabled } : w));
      } else if (result.error) {
        showError(result.error, '切换状态失败');
      }
    } catch (err) {
      showError(err, '切换状态失败');
    } finally {
      setToggleId(null);
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      const result = await apiDelete(`/api/v1/admin/webhooks/${id}`);
      if (result.success) {
        setWebhooks(prev => prev.filter(w => w.id !== id));
      } else if (result.error) {
        showError(result.error, '删除失败');
      }
    } catch (err) {
      showError(err, '删除失败');
    }
    setDeleteId(null);
  };

  const loadHistory = async (id: string) => {
    if (historyMap[id]) { setShowHistoryId(showHistoryId === id ? null : id); return; }
    try {
      const result = await apiGet<WebhookHistory[]>(`/api/v1/admin/webhooks/${id}/history`);
      if (result.success && result.data) {
        setHistoryMap(prev => ({ ...prev, [id]: result.data }));
        setShowHistoryId(id);
      }
    } catch (err) {
      showError(err, '加载历史失败');
    }
  };

  const testWebhook = async (id: string) => {
    try {
      const result = await apiPost(`/api/v1/admin/webhooks/${id}/test`, {});
      if (result.success) showError(null, '测试请求已发送！请检查目标 URL 是否收到请求。');
      else if (result.error) showError(result.error, '测试失败');
    } catch (err) {
      showError(err, '测试失败');
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">🔗 Webhook 管理</h2>
      <p className="text-sm text-muted-foreground mb-6">配置和管理系统 Webhook 通知</p>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /><span>加载中...</span></div>
      ) : webhooks.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">暂无 Webhook 配置</div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(webhook => (
            <Card key={webhook.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-gray-500">{webhook.id}</span>
                      <button
                        onClick={() => toggleWebhook(webhook.id, !webhook.enabled)}
                        disabled={toggleId === webhook.id}
                        className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                          webhook.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {toggleId === webhook.id ? '...' : webhook.enabled ? '启用' : '禁用'}
                      </button>
                    </div>
                    <p className="text-sm text-foreground mb-1">{webhook.name || webhook.url}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{webhook.url}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {webhook.events.slice(0, 5).map(e => (
                        <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                      ))}
                      {webhook.events.length > 5 && <Badge variant="outline" className="text-xs">+{webhook.events.length - 5}</Badge>}
                    </div>
                    {showHistoryId === webhook.id && historyMap[webhook.id] && (
                      <div className="mt-3 space-y-1">
                        {historyMap[webhook.id].slice(0, 5).map(h => (
                          <div key={h.id} className="text-xs bg-muted p-2 rounded flex justify-between">
                            <span>{h.triggeredAt} — {h.status}</span>
                            <span className={h.status === 'success' ? 'text-green-600' : 'text-red-600'}>{h.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <ButtonLucide variant="ghost" size="sm" onClick={() => loadHistory(webhook.id)}>历史</ButtonLucide>
                    <ButtonLucide variant="ghost" size="sm" onClick={() => testWebhook(webhook.id)}>测试</ButtonLucide>
                    <ButtonLucide variant="ghost" size="sm" onClick={() => setDeleteId(webhook.id)}><Trash2 className="w-4 h-4 text-red-500" /></ButtonLucide>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-4">确定要删除此 Webhook 吗？此操作不可撤销。</p>
          <DialogFooter>
            <ButtonLucide variant="outline" onClick={() => setDeleteId(null)}>取消</ButtonLucide>
            <ButtonLucide variant="destructive" onClick={() => deleteId && deleteWebhook(deleteId)}>确认删除</ButtonLucide>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ Cron Panel (from /cron) ============

function CronPanel() {
  const [searchName, setSearchName] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'stopped'>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { data, isLoading } = useCronList();
  const startCron = useStartCron();
  const stopCron = useStopCron();

  const filteredData = data?.data.filter((cron) => {
    const matchName = !searchName || cron.name.toLowerCase().includes(searchName.toLowerCase());
    const matchStatus = filterStatus === 'all' || cron.status === filterStatus;
    return matchName && matchStatus;
  }) || [];

  const getCronDescription = (cronExpr: string) => {
    const parts = cronExpr.split(' ');
    if (parts.length !== 5) return '未知';
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `天 ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
    return '自定义';
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">⏰ 定时任务</h2>
      <p className="text-sm text-muted-foreground mb-6">管理自动执行的定时任务</p>

      <div className="flex items-center gap-3 mb-4">
        <InputLucide value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="搜索任务名称..." className="w-64" />
        <LegacySelect value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)} options={[{ value: 'all', label: '全部状态' }, { value: 'running', label: '运行中' }, { value: 'stopped', label: '已停止' }]} className="w-auto min-w-[120px]" />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /><span>加载中...</span></div>
        ) : filteredData.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">{searchName || filterStatus !== 'all' ? '暂无匹配结果' : '暂无定时任务'}</div>
        ) : (
          filteredData.map((cron) => (
            <Card key={cron.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-gray-500">{cron.id}</span>
                    <Badge variant={CRON_STATUS_BADGE_VARIANT[cron.status]}>{CRON_STATUS_LABELS[cron.status]}</Badge>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{cron.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono">{cron.cron}</span>
                    <span className="text-xs">(每{getCronDescription(cron.cron)})</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{cron.prompt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ButtonLucide size="sm" variant="outline" onClick={() => { setEditCron(cron); setIsModalOpen(true); }}>编辑</ButtonLucide>
                  <ButtonLucide size="sm" variant="outline" onClick={() => setViewLogsCron(cron)}>日志</ButtonLucide>
                  {cron.status === 'running' ? (
                    <ButtonLucide size="sm" variant="outline" onClick={async () => { setPendingId(cron.id); await stopCron.mutateAsync(cron.id); setPendingId(null); }}>
                      {pendingId === cron.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}停止
                    </ButtonLucide>
                  ) : (
                    <ButtonLucide size="sm" onClick={async () => { setPendingId(cron.id); await startCron.mutateAsync(cron.id); setPendingId(null); }}>
                      {pendingId === cron.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}启动
                    </ButtonLucide>
                  )}
                  <ButtonLucide variant="ghost" size="icon" onClick={() => setConfirmDeleteId(cron.id)}>
                    {pendingId === cron.id ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                  </ButtonLucide>
                </div>
              </CardContent>
            </Card>
          ))
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
  const { showError } = useApiError();

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const result = await apiGet<DemoStatus>('/api/v1/admin/demo/status');
      if (result.success && result.data) {
        setStatus(result.data);
      } else if (result.error) {
        showError(result.error, '获取 Demo 状态失败');
      }
    } catch (err) {
      showError(err, '获取 Demo 状态失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSeed = async () => {
    setActionLoading('seed');
    setActionResult(null);
    try {
      const result = await apiPost<{ seeded: boolean }>('/api/v1/admin/demo/seed', {});
      if (result.success && result.data) {
        setActionResult({ type: 'success', message: result.data.seeded ? 'Demo 数据加载成功！' : 'Demo 数据已存在，无需重复加载。' });
        await fetchStatus();
      } else if (result.error) {
        showError(result.error, '加载 Demo 数据失败');
        setActionResult({ type: 'error', message: '加载失败' });
      }
    } catch (err) {
      showError(err, '加载 Demo 数据失败');
      setActionResult({ type: 'error', message: '加载失败' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleClear = async () => {
    if (!confirm('确定要清除所有 Demo 数据吗？此操作不可恢复！')) return;
    setActionLoading('clear');
    setActionResult(null);
    try {
      const result = await apiPost('/api/v1/admin/demo/clear', {});
      if (result.success) {
        setActionResult({ type: 'success', message: 'Demo 数据已清除！' });
        await fetchStatus();
      } else if (result.error) {
        showError(result.error, '清除 Demo 数据失败');
        setActionResult({ type: 'error', message: '清除失败' });
      }
    } catch (err) {
      showError(err, '清除 Demo 数据失败');
      setActionResult({ type: 'error', message: '清除失败' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        🎮 Demo 数据管理
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        以 TeamClaw 自身作为示例项目，预置完整的 Demo 数据（任务、版本、消息、标签），方便快速了解系统功能。
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
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
                    <div className="text-lg font-bold text-foreground">{item.value}</div>
                    <div className="text-xs text-muted-foreground">{item.label}</div>
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
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span>清除后 Demo 数据不可恢复。生产环境部署时请务必清除 Demo 数据。</span>
          </div>
        </>
      ) : (
        <div className="text-sm text-muted-foreground">加载状态失败</div>
      )}
    </div>
  );
}

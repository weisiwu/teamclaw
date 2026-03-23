'use client';

import { useEffect, useState, useCallback } from 'react';
import type { AuditLog } from '../../../lib/api/auditLogs';
import { PermissionGuard } from '@/components/layout/PermissionGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LegacySelect } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Download, 
  RefreshCw, 
  Clock, 
  User, 
  FileText, 
  Settings,
  Webhook,
  Tag,
  Shield,
  Layers,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  'user.create': '用户创建', 'user.delete': '用户删除', 'user.update': '用户更新',
  'role.change': '角色变更', 'version.create': '版本创建', 'version.delete': '版本删除',
  'version.bump': '版本升级', 'config.change': '配置变更', 'webhook.create': 'Webhook创建',
  'webhook.update': 'Webhook更新', 'webhook.delete': 'Webhook删除', 'webhook.trigger': 'Webhook触发',
  'task.cancel': '任务取消', 'cron.create': '定时任务创建', 'cron.delete': '定时任务删除',
  'file.upload': '文件上传', 'file.delete': '文件删除', 'login': '登录', 'logout': '登出',
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'user.create': <User className="w-3.5 h-3.5" />,
  'user.delete': <User className="w-3.5 h-3.5" />,
  'user.update': <User className="w-3.5 h-3.5" />,
  'role.change': <Shield className="w-3.5 h-3.5" />,
  'version.create': <Layers className="w-3.5 h-3.5" />,
  'version.delete': <Layers className="w-3.5 h-3.5" />,
  'version.bump': <Layers className="w-3.5 h-3.5" />,
  'config.change': <Settings className="w-3.5 h-3.5" />,
  'webhook.create': <Webhook className="w-3.5 h-3.5" />,
  'webhook.update': <Webhook className="w-3.5 h-3.5" />,
  'webhook.delete': <Webhook className="w-3.5 h-3.5" />,
  'webhook.trigger': <Webhook className="w-3.5 h-3.5" />,
  'task.cancel': <Tag className="w-3.5 h-3.5" />,
  'cron.create': <Clock className="w-3.5 h-3.5" />,
  'cron.delete': <Clock className="w-3.5 h-3.5" />,
  'file.upload': <FileText className="w-3.5 h-3.5" />,
  'file.delete': <FileText className="w-3.5 h-3.5" />,
  'login': <User className="w-3.5 h-3.5" />,
  'logout': <User className="w-3.5 h-3.5" />,
};

const ACTION_COLORS: Record<string, string> = {
  'user.delete': 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  'version.delete': 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  'config.change': 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  'role.change': 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  'webhook.trigger': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  'login': 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  'logout': 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
};

interface ActionStats {
  action: string;
  count: number;
  label: string;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string>('');
  const [actor, setActor] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const limit = 30;

  // Toast 通知
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    if (toastVisible) {
      const timer = setTimeout(() => setToastVisible(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastVisible]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (actor) params.set('actor', actor);
      if (keyword) params.set('keyword', keyword);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      const res = await fetch(`/api/v1/admin/audit-logs?${params}`);
      const data = await res.json();
      setLogs(data.data?.list || []);
      setTotal(data.data?.total || 0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [action, actor, keyword, startDate, endDate, limit, offset]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Compute action stats for summary cards
  const actionStats = (): ActionStats[] => {
    const counts: Record<string, number> = {};
    logs.forEach(log => {
      counts[log.action] = (counts[log.action] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([action, count]) => ({
        action,
        count,
        label: ACTION_LABELS[action] || action,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  const exportCsv = async () => {
    const params = new URLSearchParams();
    if (action) params.set('action', action);
    if (actor) params.set('actor', actor);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    try {
      const res = await fetch(`/api/v1/admin/audit-logs/export?${params}`);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { showToast('导出失败', 'error'); }
  };

  const pageLabel = () => {
    const start = total === 0 ? 0 : offset + 1;
    const end = Math.min(offset + limit, total);
    return `${start}-${end} / ${total}`;
  };

  return (
    <PermissionGuard>
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">审计日志</h1>
          <p className="page-header-subtitle">记录所有敏感操作，支持筛选和导出</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-2" />
            导出 CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Action Type Summary */}
      {!loading && logs.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {actionStats().map(stat => (
            <Card key={stat.action} className="py-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`p-1 rounded ${ACTION_COLORS[stat.action] || 'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'}`}>
                  {ACTION_ICONS[stat.action] || <FileText className="w-3.5 h-3.5" />}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.count}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">操作类型</label>
              <LegacySelect
                value={action}
                onChange={e => { setAction(e.target.value); setOffset(0); }}
                options={[
                  { value: '', label: '全部操作' },
                  ...Object.entries(ACTION_LABELS).map(([k, v]) => ({ value: k, label: v }))
                ]}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">操作者</label>
              <Input
                value={actor}
                onChange={e => { setActor(e.target.value); setOffset(0); }}
                placeholder="搜索操作者"
                className="h-9 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">关键词</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={keyword}
                  onChange={e => { setKeyword(e.target.value); setOffset(0); }}
                  placeholder="搜索详情"
                  className="h-9 text-sm pl-9"
                />
              </div>
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">开始日期</label>
              <Input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setOffset(0); }}
                className="h-9 text-sm"
              />
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">结束日期</label>
              <Input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setOffset(0); }}
                className="h-9 text-sm"
              />
            </div>
            <Button size="sm" onClick={fetchLogs} disabled={loading} className="h-9">
              <Search className="w-4 h-4 mr-1.5" />
              搜索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin opacity-50" />
              <p>加载中...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>暂无日志记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50 dark:bg-slate-800/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">时间</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">操作</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">操作者</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">目标</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">详情</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr 
                      key={log.id} 
                      className={`border-b last:border-0 hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/30 dark:bg-slate-800/20' : ''}`}
                    >
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          {new Date(log.timestamp).toLocaleString('zh-CN', { 
                            month: '2-digit', 
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge 
                          className={`text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'}`}
                        >
                          {ACTION_ICONS[log.action] || null}
                          <span className="ml-1">{ACTION_LABELS[log.action] || log.action}</span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-200">{log.actor}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">
                        {log.target || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate" title={log.details ? JSON.stringify(log.details) : ''}>
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">{pageLabel()}</span>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setOffset(Math.max(0, offset - limit))} 
              disabled={offset === 0}
            >
              上一页
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setOffset(offset + limit)} 
              disabled={offset + limit >= total}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* Toast 通知 */}
      {toastVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${
              toastType === "success" ? "bg-gray-900" : "bg-red-600"
            }`}
          >
            {toastType === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-white" />
            )}
            <span>{toastMsg}</span>
          </div>
        </div>
      )}
    </div>
    </PermissionGuard>
  );
}

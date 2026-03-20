'use client';

import { useEffect, useState } from 'react';
import type { AuditLog } from '../../../lib/api/auditLogs';
import { PermissionGuard } from '@/components/layout/PermissionGuard';

const ACTION_LABELS: Record<string, string> = {
  'user.create': '用户创建', 'user.delete': '用户删除', 'user.update': '用户更新',
  'role.change': '角色变更', 'version.create': '版本创建', 'version.delete': '版本删除',
  'version.bump': '版本升级', 'config.change': '配置变更', 'webhook.create': 'Webhook创建',
  'webhook.update': 'Webhook更新', 'webhook.delete': 'Webhook删除', 'webhook.trigger': 'Webhook触发',
  'task.cancel': '任务取消', 'cron.create': '定时任务创建', 'cron.delete': '定时任务删除',
  'file.upload': '文件上传', 'file.delete': '文件删除', 'login': '登录', 'logout': '登出',
};

const ACTION_COLORS: Record<string, string> = {
  'user.delete': 'text-red-600', 'version.delete': 'text-red-600', 'config.change': 'text-orange-600',
  'role.change': 'text-purple-600', 'webhook.trigger': 'text-blue-600',
};

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

  const fetchLogs = async () => {
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
  };

  useEffect(() => { fetchLogs(); }, [action, offset]);

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
    } catch { alert('导出失败'); }
  };

  const pageLabel = () => {
    const start = total === 0 ? 0 : offset + 1;
    const end = Math.min(offset + limit, total);
    return `${start}-${end} / ${total}`;
  };

  return (
    <PermissionGuard>
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">审计日志</h1>
            <p className="text-sm text-gray-500 mt-1">记录所有敏感操作，支持筛选和导出</p>
          </div>
          <button onClick={exportCsv} className="px-4 py-2 text-sm border rounded hover:bg-gray-100">
            导出 CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">操作类型</label>
            <select value={action} onChange={e => { setAction(e.target.value); setOffset(0); }}
              className="border border-gray-300 dark:border-slate-500 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400">
              <option value="">全部</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">操作者</label>
            <input value={actor} onChange={e => { setActor(e.target.value); setOffset(0); }}
              className="border border-gray-300 dark:border-slate-500 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder:text-gray-400 dark:placeholder:text-slate-500" placeholder="搜索操作者" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">关键词</label>
            <input value={keyword} onChange={e => { setKeyword(e.target.value); setOffset(0); }}
              className="border border-gray-300 dark:border-slate-500 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder:text-gray-400 dark:placeholder:text-slate-500" placeholder="搜索详情" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">开始日期</label>
            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setOffset(0); }}
              className="border border-gray-300 dark:border-slate-500 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">结束日期</label>
            <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setOffset(0); }}
              className="border border-gray-300 dark:border-slate-500 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
          </div>
          <button onClick={fetchLogs} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            搜索
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">暂无日志记录</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">时间</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">操作</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">操作者</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">目标</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">详情</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('zh-CN')}</td>
                    <td className={`px-4 py-3 font-medium ${ACTION_COLORS[log.action] || 'text-gray-700'}`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </td>
                    <td className="px-4 py-3">{log.actor}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{log.target || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>{pageLabel()}</span>
            <div className="flex gap-2">
              <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}
                className="px-3 py-1 border rounded disabled:opacity-50">上一页</button>
              <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total}
                className="px-3 py-1 border rounded disabled:opacity-50">下一页</button>
            </div>
          </div>
        )}
      </div>
    </div>
    </PermissionGuard>
  );
}

'use client';

import { useEffect, useState } from 'react';
import type { Webhook, WebhookHistory } from '../../../lib/api/webhooks';
import { PermissionGuard } from '@/components/layout/PermissionGuard';
import { CheckCircle2, XCircle, Trash2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const EVENT_OPTIONS = [
  'version.created', 'version.deleted', 'version.bumped',
  'task.created', 'task.completed', 'task.failed', 'task.cancelled',
  'user.created', 'user.deleted', 'config.changed',
  'cron.triggered', 'cron.failed',
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, WebhookHistory[]>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; statusCode?: number; error?: string } | null>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; webhookId: string }>({ open: false, webhookId: '' });

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

  // Form state
  const [form, setForm] = useState({ name: '', url: '', secret: '', events: [] as string[] });

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/v1/admin/webhooks');
      const data = await res.json();
      setWebhooks(data.data?.list || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWebhooks(); }, []);

  const createWebhook = async () => {
    if (!form.name || !form.url || form.events.length === 0) { showToast('请填写完整', 'error'); return; }
    try {
      const res = await fetch('/api/v1/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setWebhooks(prev => [data.data, ...prev]);
        setShowForm(false);
        setForm({ name: '', url: '', secret: '', events: [] });
      }
    } catch { showToast('创建失败', 'error'); }
  };

  const updateWebhook = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/webhooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setWebhooks(prev => prev.map(w => w.id === id ? data.data : w));
        setEditingId(null);
        setForm({ name: '', url: '', secret: '', events: [] });
      }
    } catch { showToast('更新失败', 'error'); }
  };

  const deleteWebhook = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/webhooks/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch { showToast('删除失败', 'error'); }
  };

  const testWebhook = async (id: string) => {
    setTesting(id);
    setTestResult(prev => ({ ...prev, [id]: null }));
    try {
      const res = await fetch(`/api/v1/admin/webhooks/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult(prev => ({ ...prev, [id]: data.data }));
    } catch { setTestResult(prev => ({ ...prev, [id]: { success: false, error: '请求失败' } })); }
    finally { setTesting(null); }
  };

  const loadHistory = async (id: string) => {
    if (historyMap[id]) return;
    try {
      const res = await fetch(`/api/v1/admin/webhooks/${id}/history`);
      const data = await res.json();
      setHistoryMap(prev => ({ ...prev, [id]: data.data?.list || [] }));
    } catch { /* ignore */ }
  };

  const startEdit = (wh: Webhook) => {
    setEditingId(wh.id);
    setForm({ name: wh.name, url: wh.url, secret: wh.secret || '', events: wh.events });
    setShowForm(true);
  };

  const toggleStatus = async (wh: Webhook) => {
    const newStatus = wh.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/v1/admin/webhooks/${wh.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) setWebhooks(prev => prev.map(w => w.id === wh.id ? data.data : w));
    } catch { /* ignore */ }
  };

  const toggleEvent = (event: string) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter(e => e !== event) : [...prev.events, event],
    }));
  };

  return (
    <PermissionGuard>
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Webhook 配置</h1>
            <p className="text-sm text-gray-500 mt-1">配置系统事件通知的 Webhook 回调</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', url: '', secret: '', events: [] }); }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            + 新建 Webhook
          </button>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-medium mb-4">{editingId ? '编辑 Webhook' : '新建 Webhook'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">名称</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="我的 Webhook" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">回调 URL</label>
                <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="https://example.com/webhook" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">签名密钥（可选）</label>
                <input value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="用于签名验证" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">订阅事件</label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_OPTIONS.map(event => (
                    <button key={event} onClick={() => toggleEvent(event)}
                      className={`px-2 py-1 text-xs rounded border ${form.events.includes(event) ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-50 border-gray-300 text-gray-600'}`}>
                      {event}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={editingId ? () => updateWebhook(editingId) : createWebhook}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                  {editingId ? '保存' : '创建'}
                </button>
                <button onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2 text-sm border rounded hover:bg-gray-50">取消</button>
              </div>
            </div>
          </div>
        )}

        {/* Webhook List */}
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : webhooks.length === 0 ? (
          <div className="p-8 text-center text-gray-400 bg-white rounded-lg shadow">暂无 Webhook，点击上方按钮创建</div>
        ) : (
          <div className="space-y-4">
            {webhooks.map(wh => (
              <div key={wh.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{wh.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded ${wh.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {wh.status === 'active' ? '启用' : '暂停'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">{wh.url}</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {wh.events.map(e => (
                        <span key={e} className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">{e}</span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-400">
                      成功 {wh.successCount} 次 | 失败 {wh.failCount} 次
                      {wh.lastTriggerAt && <span> | 上次: {new Date(wh.lastTriggerAt).toLocaleString('zh-CN')}</span>}
                    </div>
                    {testResult[wh.id] !== null && testResult[wh.id] !== undefined && (
                      <div className={`mt-2 text-xs p-2 rounded ${testResult[wh.id]!.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        测试结果: {testResult[wh.id]!.success ? `成功 (HTTP ${testResult[wh.id]!.statusCode})` : testResult[wh.id]!.error}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => testWebhook(wh.id)} disabled={testing === wh.id}
                      className="px-3 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50">
                      {testing === wh.id ? '测试中...' : '测试'}
                    </button>
                    <button onClick={() => loadHistory(wh.id)}
                      className="px-3 py-1 text-xs border rounded hover:bg-gray-50">历史</button>
                    <button onClick={() => startEdit(wh)}
                      className="px-3 py-1 text-xs border rounded hover:bg-gray-50">编辑</button>
                    <button onClick={() => toggleStatus(wh)}
                      className="px-3 py-1 text-xs border rounded hover:bg-gray-50">
                      {wh.status === 'active' ? '暂停' : '启用'}
                    </button>
                    <button onClick={() => setDeleteConfirm({ open: true, webhookId: wh.id })}
                      className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50">删除</button>
                  </div>
                </div>

                {/* History */}
                {historyMap[wh.id] && historyMap[wh.id].length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-medium text-gray-500 mb-2">最近通知历史</div>
                    <div className="space-y-1">
                      {historyMap[wh.id].slice(0, 5).map(h => (
                        <div key={h.id} className="flex items-center gap-2 text-xs text-gray-500">
                          <span className={`w-2 h-2 rounded-full ${h.success ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span>{h.event}</span>
                          <span>{new Date(h.timestamp).toLocaleString('zh-CN')}</span>
                          <span>{h.durationMs}ms</span>
                          {h.responseStatus && <span>HTTP {h.responseStatus}</span>}
                          {h.error && <span className="text-red-500">{h.error}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              确认删除 Webhook
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mt-2">
            确定要删除这个 Webhook 吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm((prev) => ({ ...prev, open: false }))}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteWebhook(deleteConfirm.webhookId);
                setDeleteConfirm((prev) => ({ ...prev, open: false }));
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

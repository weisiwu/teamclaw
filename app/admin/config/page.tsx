'use client';

import { useEffect, useState } from 'react';
import type { SystemConfig } from '../../../lib/api/adminConfig';
import { PermissionGuard } from '@/components/layout/PermissionGuard';

export default function AdminConfigPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'llm' | 'features' | 'security'>('llm');

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/v1/admin/config');
      const data = await res.json();
      setConfig(data.data);
    } catch {
      setError('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/v1/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('配置已保存');
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.error || '保存失败');
      }
    } catch {
      setError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = async () => {
    if (!confirm('确定要重置为默认配置吗？')) return;
    try {
      const res = await fetch('/api/v1/admin/config/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) setConfig(data.data);
    } catch { setError('重置失败'); }
  };

  const exportConfig = async () => {
    try {
      const res = await fetch('/api/v1/admin/config/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.data?.config || {}, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-config-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { setError('导出失败'); }
  };

  const importConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const res = await fetch('/api/v1/admin/config/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: text }),
        });
        const data = await res.json();
        if (data.success) setConfig(data.data);
      } catch { setError('导入失败'); }
    };
    input.click();
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><span className="text-gray-500">加载中...</span></div>;

  if (!config) return <div className="text-red-500 p-8">{error || '加载失败'}</div>;

  return (
    <PermissionGuard>
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">系统配置</h1>
            <p className="text-sm text-gray-500 mt-1">配置 LLM 模型、功能开关和安全策略</p>
          </div>
          <div className="flex gap-2">
            <button onClick={importConfig} className="px-4 py-2 text-sm border rounded hover:bg-gray-100">导入</button>
            <button onClick={exportConfig} className="px-4 py-2 text-sm border rounded hover:bg-gray-100">导出</button>
            <button onClick={resetConfig} className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50">重置</button>
            <button onClick={saveConfig} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>

        {successMsg && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded">{successMsg}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

        {/* Tabs */}
        <div className="flex border-b mb-6">
          {(['llm', 'features', 'security'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab === 'llm' ? 'LLM 模型' : tab === 'features' ? '功能开关' : '安全策略'}
            </button>
          ))}
        </div>

        {/* LLM Config */}
        {activeTab === 'llm' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">默认模型</label>
              <input value={config.llm.defaultModel}
                onChange={e => setConfig({ ...config, llm: { ...config.llm, defaultModel: e.target.value } })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temperature ({config.llm.temperature})</label>
              <input type="range" min="0" max="2" step="0.1"
                value={config.llm.temperature}
                onChange={e => setConfig({ ...config, llm: { ...config.llm, temperature: parseFloat(e.target.value) } })}
                className="w-full" />
              <span className="text-xs text-gray-500">0=确定性强, 2=创意性强</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最大输出 Token</label>
              <input type="number" value={config.llm.maxTokens}
                onChange={e => setConfig({ ...config, llm: { ...config.llm, maxTokens: parseInt(e.target.value) } })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        {/* Feature Flags */}
        {activeTab === 'features' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            {[
              { key: 'fileUpload', label: '文件上传', desc: '允许上传文件和附件' },
              { key: 'webhook', label: 'Webhook', desc: '启用 Webhook 通知功能' },
              { key: 'autoBackup', label: '自动备份', desc: '自动备份系统数据' },
              { key: 'aiSummary', label: 'AI 摘要', desc: '自动生成版本摘要' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
                <button
                  onClick={() => setConfig({ ...config, features: { ...config.features, [item.key]: !config.features[item.key as keyof typeof config.features] } })}
                  className={`w-12 h-6 rounded-full transition-colors ${((config.features as unknown) as Record<string, boolean>)[item.key] ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${((config.features as unknown) as Record<string, boolean>)[item.key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Security */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">允许的 IP 范围（逗号分隔）</label>
              <input value={config.security.allowedIpRanges.join(', ')}
                onChange={e => setConfig({ ...config, security: { ...config.security, allowedIpRanges: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="0.0.0.0/0, 192.168.1.0/24" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">删除需审批</div>
                <div className="text-xs text-gray-500">删除重要资源时需要管理员确认</div>
              </div>
              <button onClick={() => setConfig({ ...config, security: { ...config.security, requireApprovalForDelete: !config.security.requireApprovalForDelete } })}
                className={`w-12 h-6 rounded-full transition-colors ${config.security.requireApprovalForDelete ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${config.security.requireApprovalForDelete ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session 超时（分钟）</label>
              <input type="number" value={config.security.sessionTimeoutMinutes}
                onChange={e => setConfig({ ...config, security: { ...config.security, sessionTimeoutMinutes: parseInt(e.target.value) } })}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-400">
          最后更新：{config.updatedAt} by {config.updatedBy}
        </div>
      </div>
    </div>
    </PermissionGuard>
  );
}

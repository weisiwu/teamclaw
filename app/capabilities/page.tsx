'use client';

import { useEffect, useState } from 'react';

interface Ability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  requiredRole: string;
}

export default function CapabilitiesPage() {
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const userRole = (typeof window !== 'undefined' ? localStorage.getItem('userRole') : 'user') || 'user';

  const fetchAbilities = async () => {
    try {
      const res = await fetch('/api/v1/abilities');
      const data = await res.json();
      setAbilities(data.data?.list || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch abilities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbilities();
  }, []);

  const toggleAbility = async (ability: Ability) => {
    if (userRole !== 'admin' && userRole !== 'sub_admin') return;
    setToggling(ability.id);
    try {
      const res = await fetch(`/api/v1/abilities/${ability.id}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
        },
        body: JSON.stringify({ enabled: !ability.enabled }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setAbilities(prev =>
          prev.map(a => a.id === ability.id ? { ...a, enabled: !a.enabled } : a)
        );
      }
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setToggling(null);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') return <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700">管理员</span>;
    if (role === 'sub_admin') return <span className="px-2 py-0.5 text-xs rounded bg-orange-100 text-orange-700">副管理员</span>;
    return <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">全体成员</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">辅助能力管理</h1>
        <p className="text-sm text-gray-500 mb-8">配置系统辅助能力的启用/禁用状态</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {abilities.map(ability => (
            <div
              key={ability.id}
              className={`bg-white rounded-lg shadow p-5 border-l-4 ${
                ability.enabled ? 'border-green-400' : 'border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{ability.name}</h3>
                    {getRoleBadge(ability.requiredRole)}
                  </div>
                  <p className="text-sm text-gray-500">{ability.description}</p>
                </div>
                <button
                  onClick={() => toggleAbility(ability)}
                  disabled={toggling === ability.id || (userRole !== 'admin' && userRole !== 'sub_admin')}
                  className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    ability.enabled ? 'bg-green-500' : 'bg-gray-300'
                  } ${
                    (userRole === 'admin' || userRole === 'sub_admin') ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      ability.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                  {toggling === ability.id && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-gray-500">...</span>
                    </span>
                  )}
                </button>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100">
                <span className={`text-xs font-mono ${ability.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {ability.enabled ? '● 已启用' : '○ 已禁用'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {(userRole !== 'admin' && userRole !== 'sub_admin') && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
            ⚠️ 只有管理员或副管理员可以修改能力配置
          </div>
        )}
      </div>
    </div>
  );
}

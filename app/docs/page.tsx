'use client';

import { useEffect, useState, useCallback } from 'react';

interface DocItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

interface DocVersion {
  versionId: string;
  docId: string;
  versionNumber: number;
  size: number;
  createdAt: string;
  createdBy: string;
  note?: string;
}

interface DocStats {
  totalDocs: number;
  totalSize: number;
  byType: Record<string, number>;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function getFileIcon(type: string): string {
  const icons: Record<string, string> = {
    md: '📝', txt: '📄', json: '{ }', xml: '📋',
    pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗',
    csv: '📊', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️',
    zip: '📦',
  };
  return icons[type.toLowerCase()] || '📄';
}

type Tab = 'docs' | 'favorites' | 'recent';

export default function DocsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [favorites, setFavorites] = useState<Array<{ docId: string; docName: string; docType: string; createdAt: string }>>([]);
  const [recent, setRecent] = useState<Array<{ docId: string; docName: string; docType: string; accessedAt: string }>>([]);
  const [stats, setStats] = useState<DocStats>({ totalDocs: 0, totalSize: 0, byType: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('docs');
  const [viewingDoc, setViewingDoc] = useState<{ name: string; content: string; format: string } | null>(null);
  const [versioningDoc, setVersioningDoc] = useState<{ name: string; docId: string } | null>(null);
  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [favoriteSet, setFavoriteSet] = useState<Set<string>>(new Set());

  const fetchDocs = useCallback(async () => {
    try {
      const url = search ? `/api/v1/docs?search=${encodeURIComponent(search)}` : '/api/v1/docs';
      const res = await fetch(url);
      const data = await res.json();
      setDocs(data.data?.list || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch docs');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/docs/stats/overview');
      const data = await res.json();
      if (data.code === 0) setStats(data.data);
    } catch { /* ignore */ }
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/docs/favorites/list');
      const data = await res.json();
      if (data.code === 0) {
        setFavorites(data.data.list || []);
        setFavoriteSet(new Set((data.data.list || []).map((f: { docId: string }) => f.docId)));
      }
    } catch { /* ignore */ }
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/docs/recent/access?limit=10');
      const data = await res.json();
      if (data.code === 0) setRecent(data.data.list || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchDocs();
    fetchStats();
    fetchFavorites();
    fetchRecent();
  }, [fetchDocs, fetchStats, fetchFavorites, fetchRecent]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchDocs();
  }, [fetchDocs]);

  const viewDoc = async (docId: string) => {
    try {
      const res = await fetch(`/api/v1/docs/${docId}`);
      const data = await res.json();
      if (data.code === 0) {
        setViewingDoc(data.data);
        // 刷新最近访问
        fetchRecent();
      }
    } catch (err) {
      console.error('View failed:', err);
    }
  };

  const viewVersions = async (docId: string, docName: string) => {
    setVersioningDoc({ docId, name: docName });
    try {
      const res = await fetch(`/api/v1/docs/${docId}/versions`);
      const data = await res.json();
      if (data.code === 0) setVersions(data.data?.list || []);
    } catch {
      setVersions([]);
    }
  };

  const downloadDoc = (docId: string) => {
    window.open(`/api/v1/docs/${docId}/download`, '_blank');
  };

  const toggleFavorite = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFav = favoriteSet.has(docId);
    try {
      if (isFav) {
        await fetch(`/api/v1/docs/${docId}/favorite?userId=default`, { method: 'DELETE' });
        setFavoriteSet(prev => { const s = new Set(prev); s.delete(docId); return s; });
        setFavorites(prev => prev.filter(f => f.docId !== docId));
      } else {
        await fetch(`/api/v1/docs/${docId}/favorite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'default' }),
        });
        setFavoriteSet(prev => new Set(prev).add(docId));
        // 找到这个doc的信息
        const doc = docs.find(d => d.id === docId);
        if (doc) {
          setFavorites(prev => [...prev, { docId, docName: doc.name, docType: doc.type, createdAt: new Date().toISOString() }]);
        }
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err);
    }
  };

  const restoreVersion = async (docId: string, versionId: string) => {
    if (!confirm('确认恢复此版本？将创建新版本快照')) return;
    try {
      await fetch(`/api/v1/docs/${docId}/versions/${versionId}/restore`, { method: 'POST' });
      alert('版本已恢复');
      viewVersions(docId, versioningDoc?.name || '');
      fetchDocs();
    } catch {
      alert('恢复失败');
    }
  };

  const isFav = (docId: string) => favoriteSet.has(docId);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">项目文档库</h1>
        <p className="text-sm text-gray-500 mb-6">浏览和搜索项目文档</p>

        {/* Stats Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-6 flex-wrap">
          <div>
            <p className="text-xs text-gray-500">文档总数</p>
            <p className="text-xl font-bold">{stats.totalDocs}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">总大小</p>
            <p className="text-xl font-bold">{formatSize(stats.totalSize)}</p>
          </div>
          {Object.entries(stats.byType).slice(0, 5).map(([type, count]) => (
            <div key={type}>
              <p className="text-xs text-gray-500">{type.toUpperCase()}</p>
              <p className="text-xl font-bold">{count}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['docs', 'favorites', 'recent'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                tab === t
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {t === 'docs' ? '📂 文档列表' : t === 'favorites' ? '⭐ 收藏夹' : '🕐 最近访问'}
            </button>
          ))}
        </div>

        {/* Search (only on docs tab) */}
        {tab === 'docs' && (
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索文档名称..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">搜索</button>
            <button type="button" onClick={() => { setSearch(''); setLoading(true); fetchDocs(); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">重置</button>
          </form>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
        )}

        {/* Version History Modal */}
        {versioningDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold text-gray-900">📋 版本历史 - {versioningDoc.name}</h2>
                <button onClick={() => setVersioningDoc(null)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {versions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">暂无版本记录</p>
                ) : (
                  <div className="space-y-3">
                    {versions.map(v => (
                      <div key={v.versionId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">v{v.versionNumber} {v.note ? `- ${v.note}` : ''}</p>
                          <p className="text-xs text-gray-500">{formatDate(v.createdAt)} · {formatSize(v.size)}</p>
                        </div>
                        <div className="flex gap-2">
                          <a href={`/api/v1/docs/${versioningDoc.docId}/versions/${v.versionId}`} target="_blank" rel="noreferrer" className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition">下载</a>
                          <button onClick={() => restoreVersion(versioningDoc.docId, v.versionId)} className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 transition">恢复</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Doc Viewer Modal */}
        {viewingDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold text-gray-900 truncate">{viewingDoc.name}</h2>
                <button onClick={() => setViewingDoc(null)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">{viewingDoc.content}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Content based on tab */}
        {tab === 'docs' && (
          loading && docs.length === 0 ? (
            <div className="flex items-center justify-center min-h-[200px]"><div className="text-lg text-gray-500">加载中...</div></div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📂</div><p>暂无文档</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">文档</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">大小</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">上传时间</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {docs.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileIcon(doc.type)}</span>
                          <span className="font-medium text-gray-900 truncate max-w-xs">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="text-xs font-mono px-2 py-1 bg-gray-100 rounded text-gray-600">{doc.type.toUpperCase()}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatSize(doc.size)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(doc.uploadedAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={(e) => toggleFavorite(doc.id, e)} className={`px-3 py-1 text-sm rounded transition ${isFav(doc.id) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}>
                            {isFav(doc.id) ? '⭐' : '☆'}
                          </button>
                          {['md', 'txt', 'json', 'xml'].includes(doc.type.toLowerCase()) && (
                            <button onClick={() => viewDoc(doc.id)} className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition">查看</button>
                          )}
                          <button onClick={() => viewVersions(doc.id, doc.name)} className="px-3 py-1 text-sm bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition">版本</button>
                          <button onClick={() => downloadDoc(doc.id)} className="px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition">下载</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'favorites' && (
          favorites.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">⭐</div><p>暂无收藏</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">文档</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">收藏时间</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {favorites.map(f => (
                    <tr key={f.docId} className="hover:bg-gray-50">
                      <td className="px-6 py-4"><span className="font-medium">{f.docName}</span></td>
                      <td className="px-6 py-4"><span className="text-xs font-mono px-2 py-1 bg-gray-100 rounded">{f.docType.toUpperCase()}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(f.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={(e) => toggleFavorite(f.docId, e)} className="px-3 py-1 text-sm bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100 transition">取消收藏</button>
                          <button onClick={() => downloadDoc(f.docId)} className="px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition">下载</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'recent' && (
          recent.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🕐</div><p>暂无访问记录</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">文档</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">访问时间</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recent.map(r => (
                    <tr key={`${r.docId}-${r.accessedAt}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4"><span className="font-medium">{r.docName}</span></td>
                      <td className="px-6 py-4"><span className="text-xs font-mono px-2 py-1 bg-gray-100 rounded">{r.docType.toUpperCase()}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(r.accessedAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {['md', 'txt', 'json', 'xml'].includes(r.docType.toLowerCase()) && (
                            <button onClick={() => viewDoc(r.docId)} className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition">查看</button>
                          )}
                          <button onClick={() => downloadDoc(r.docId)} className="px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition">下载</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}

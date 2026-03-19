'use client';

import { useEffect, useState, useCallback } from 'react';
import { DocSearchBox } from '@/components/DocSearchBox';
import { DocViewer } from '@/components/DocViewer';
import { DownloadManager } from '@/components/DownloadManager';

interface DocItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

interface DocVersion {
  versionId: string;
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

function canPreview(type: string): boolean {
  return ['md', 'txt', 'json', 'xml', 'pdf', 'code'].some(
    t => type.toLowerCase().includes(t)
  );
}

type Tab = 'docs' | 'favorites' | 'recent';

interface SearchFilter {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
  sizeMin?: number;
  sizeMax?: number;
}

export default function DocsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [favorites, setFavorites] = useState<Array<{ docId: string; docName: string; docType: string; createdAt: string }>>([]);
  const [recent, setRecent] = useState<Array<{ docId: string; docName: string; docType: string; accessedAt: string }>>([]);
  const [stats, setStats] = useState<DocStats>({ totalDocs: 0, totalSize: 0, byType: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('docs');

  // New state for enhanced features
  const [viewingDoc, setViewingDoc] = useState<{ id: string; name: string } | null>(null);
  const [versioningDoc, setVersioningDoc] = useState<{ name: string; docId: string } | null>(null);
  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [favoriteSet, setFavoriteSet] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Map<string, DocItem>>(new Map());
  const [showDownloadManager, setShowDownloadManager] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<SearchFilter>({});
  const [currentQuery, setCurrentQuery] = useState('');

  const fetchDocs = useCallback(async (query = '', filter: SearchFilter = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('search', query);
      if (filter.type) params.set('type', filter.type);
      if (filter.sizeMin) params.set('sizeMin', String(filter.sizeMin));
      if (filter.sizeMax) params.set('sizeMax', String(filter.sizeMax));

      // Use enhanced search API for semantic search
      const hasDateFilter = filter.dateFrom || filter.dateTo;
      if (hasDateFilter) {
        // Fall back to basic list and filter client-side (dates need extended API)
        params.set('search', query);
      }

      const res = await fetch(`/api/v1/docs?${params}`);
      const data = await res.json();
      let list = data.data?.list || [];

      // Apply date filters client-side
      if (filter.dateFrom) {
        const from = new Date(filter.dateFrom).getTime();
        list = list.filter((d: DocItem) => new Date(d.uploadedAt).getTime() >= from);
      }
      if (filter.dateTo) {
        const to = new Date(filter.dateTo).getTime();
        list = list.filter((d: DocItem) => new Date(d.uploadedAt).getTime() <= to);
      }

      setDocs(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch docs');
    } finally {
      setLoading(false);
    }
  }, []);

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
        setFavorites(data.data?.list || []);
        setFavoriteSet(new Set((data.data?.list || []).map((f: { docId: string }) => f.docId)));
      }
    } catch { /* ignore */ }
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/docs/recent/access?limit=10');
      const data = await res.json();
      if (data.code === 0) setRecent(data.data?.list || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchDocs();
    fetchStats();
    fetchFavorites();
    fetchRecent();
  }, [fetchDocs, fetchStats, fetchFavorites, fetchRecent]);

  const handleSearch = useCallback((query: string, filter: SearchFilter) => {
    setCurrentQuery(query);
    setCurrentFilter(filter);
    fetchDocs(query, filter);
  }, [fetchDocs]);

  const viewDoc = async (docId: string) => {
    const doc = docs.find(d => d.id === docId);
    if (doc) setViewingDoc({ id: docId, name: doc.name });
    fetchRecent();
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

  const toggleFileSelection = (doc: DocItem) => {
    setSelectedFiles(prev => {
      const next = new Map(prev);
      if (next.has(doc.id)) next.delete(doc.id);
      else next.set(doc.id, doc);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedFiles.size === docs.length) {
      setSelectedFiles(new Map());
    } else {
      setSelectedFiles(new Map(docs.map(d => [d.id, d])));
    }
  };

  const isFav = (docId: string) => favoriteSet.has(docId);
  const isSelected = (docId: string) => selectedFiles.has(docId);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">项目文档库</h1>
        <p className="text-sm text-gray-500 mb-6">智能搜索 · 在线预览 · 批量下载</p>

        {/* Stats Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 sm:gap-6 flex-wrap">
          <div>
            <p className="text-xs text-gray-500">文档总数</p>
            <p className="text-xl font-bold">{stats.totalDocs}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">总大小</p>
            <p className="text-xl font-bold">{formatSize(stats.totalSize)}</p>
          </div>
          {Object.entries(stats.byType).slice(0, 4).map(([type, count]) => (
            <div key={type}>
              <p className="text-xs text-gray-500">{type.toUpperCase()}</p>
              <p className="text-xl font-bold">{count}</p>
            </div>
          ))}
          {selectedFiles.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-blue-600 font-medium">
                已选 {selectedFiles.size} 个文件
              </span>
              <button
                onClick={() => setShowDownloadManager(true)}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-1"
              >
                📦 批量下载
              </button>
              <button
                onClick={() => setSelectedFiles(new Map())}
                className="text-sm text-gray-500 hover:text-gray-700"
              >取消</button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['docs', 'favorites', 'recent'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                tab === t
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {t === 'docs' ? '📂 文档列表' : t === 'favorites' ? '⭐ 收藏夹' : '🕐 最近访问'}
            </button>
          ))}
        </div>

        {/* Search - only on docs tab */}
        {tab === 'docs' && (
          <div className="mb-4">
            <DocSearchBox
              onSearch={handleSearch}
              placeholder="搜索文档名称..."
              defaultQuery={currentQuery}
              defaultFilter={currentFilter}
            />
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {/* Version History Modal */}
        {versioningDoc && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-8">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold text-gray-900">📋 版本历史 - {versioningDoc.name}</h2>
                <button onClick={() => setVersioningDoc(null)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {versions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">暂无版本记录</p>
                ) : (
                  <div className="space-y-2">
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
          <DocViewer
            docId={viewingDoc.id}
            docName={viewingDoc.name}
            onClose={() => setViewingDoc(null)}
          />
        )}

        {/* Download Manager Modal */}
        {showDownloadManager && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-8">
            <div className="w-full max-w-md">
              <DownloadManager
                selectedFiles={Array.from(selectedFiles.values())}
                onClose={() => setShowDownloadManager(false)}
                onClear={() => {
                  setSelectedFiles(new Map());
                  setShowDownloadManager(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Table */}
        {tab === 'docs' && (
          loading && docs.length === 0 ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-lg text-gray-500 flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                加载中...
              </div>
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">📂</div><p>暂无文档</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Select all row */}
              <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === docs.length && docs.length > 0}
                  onChange={selectAll}
                  className="w-4 h-4 rounded"
                />
                <span className="text-xs text-gray-500">全选</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="w-8 px-3 py-3"></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">文档</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">大小</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">上传时间</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {docs.map(doc => (
                      <tr
                        key={doc.id}
                        className={`hover:bg-gray-50 ${isSelected(doc.id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected(doc.id)}
                            onChange={() => toggleFileSelection(doc)}
                            className="w-4 h-4 rounded"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl flex-shrink-0">{getFileIcon(doc.type)}</span>
                            <span className="font-medium text-gray-900 truncate max-w-xs">{doc.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs font-mono px-2 py-1 bg-gray-100 rounded text-gray-600">{doc.type.toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{formatSize(doc.size)}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 hidden sm:table-cell">{formatDate(doc.uploadedAt)}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <button onClick={(e) => toggleFavorite(doc.id, e)} className={`px-2 py-1 text-sm rounded transition ${isFav(doc.id) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}>
                              {isFav(doc.id) ? '⭐' : '☆'}
                            </button>
                            {canPreview(doc.type) && (
                              <button onClick={() => viewDoc(doc.id)} className="px-2 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition">预览</button>
                            )}
                            <button onClick={() => viewVersions(doc.id, doc.name)} className="px-2 py-1 text-sm bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition">版本</button>
                            <button onClick={() => downloadDoc(doc.id)} className="px-2 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition">下载</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {tab === 'favorites' && (
          favorites.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">⭐</div><p>暂无收藏</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">文档</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">收藏时间</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {favorites.map(f => (
                    <tr key={f.docId} className="hover:bg-gray-50">
                      <td className="px-4 py-4"><span className="font-medium">{f.docName}</span></td>
                      <td className="px-4 py-4"><span className="text-xs font-mono px-2 py-1 bg-gray-100 rounded">{f.docType.toUpperCase()}</span></td>
                      <td className="px-4 py-4 text-sm text-gray-600">{formatDate(f.createdAt)}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={(e) => toggleFavorite(f.docId, e)} className="px-2 py-1 text-sm bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100 transition">取消收藏</button>
                          {canPreview(f.docType) && (
                            <button onClick={() => setViewingDoc({ id: f.docId, name: f.docName })} className="px-2 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition">预览</button>
                          )}
                          <button onClick={() => downloadDoc(f.docId)} className="px-2 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition">下载</button>
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
              <div className="text-4xl mb-3">🕐</div><p>暂无访问记录</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">文档</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">访问时间</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recent.map(r => (
                    <tr key={`${r.docId}-${r.accessedAt}`} className="hover:bg-gray-50">
                      <td className="px-4 py-4"><span className="font-medium">{r.docName}</span></td>
                      <td className="px-4 py-4"><span className="text-xs font-mono px-2 py-1 bg-gray-100 rounded">{r.docType.toUpperCase()}</span></td>
                      <td className="px-4 py-4 text-sm text-gray-600">{formatDate(r.accessedAt)}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          {canPreview(r.docType) && (
                            <button onClick={() => setViewingDoc({ id: r.docId, name: r.docName })} className="px-2 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition">预览</button>
                          )}
                          <button onClick={() => downloadDoc(r.docId)} className="px-2 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition">下载</button>
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

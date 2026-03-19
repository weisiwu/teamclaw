'use client';

import { useEffect, useState, useCallback } from 'react';

interface DocItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
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

export default function DocsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewingDoc, setViewingDoc] = useState<{ name: string; content: string; format: string } | null>(null);

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

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

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
      }
    } catch (err) {
      console.error('View failed:', err);
    }
  };

  const downloadDoc = (docId: string) => {
    window.open(`/api/v1/docs/${docId}/download`, '_blank');
  };

  if (loading && docs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">项目文档库</h1>
        <p className="text-sm text-gray-500 mb-6">浏览和搜索项目文档</p>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索文档名称..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            搜索
          </button>
          <button
            type="button"
            onClick={() => { setSearch(''); setLoading(true); fetchDocs(); }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            重置
          </button>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Doc Viewer Modal */}
        {viewingDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold text-gray-900 truncate">{viewingDoc.name}</h2>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {viewingDoc.format === 'md' ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">{viewingDoc.content}</pre>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">{viewingDoc.content}</pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Doc List */}
        {docs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📂</div>
            <p>暂无文档</p>
            <p className="text-sm mt-1">从群聊发送文件或上传到文档库</p>
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
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono px-2 py-1 bg-gray-100 rounded text-gray-600">
                        {doc.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatSize(doc.size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(doc.uploadedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {['md', 'txt', 'json', 'xml'].includes(doc.type.toLowerCase()) && (
                          <button
                            onClick={() => viewDoc(doc.id)}
                            className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                          >
                            在线查看
                          </button>
                        )}
                        <button
                          onClick={() => downloadDoc(doc.id)}
                          className="px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition"
                        >
                          下载
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

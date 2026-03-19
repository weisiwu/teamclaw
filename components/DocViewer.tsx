'use client';

import { useState, useEffect, useCallback } from 'react';

interface DocPreviewResult {
  type: 'html' | 'pdf' | 'code' | 'text' | 'unsupported' | 'image';
  content?: string;
  url?: string;
  pages?: number;
  currentPage?: number;
  size: number;
  canPreview: boolean;
  message?: string;
  filename?: string;
}

interface DocViewerProps {
  docId: string;
  docName: string;
  onClose?: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function DocViewer({ docId, docName, onClose }: DocViewerProps) {
  const [preview, setPreview] = useState<DocPreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [iframeKey, setIframeKey] = useState(0);

  const fetchPreview = useCallback(async (page?: number) => {
    setLoading(true);
    setError(null);
    try {
      const url = page
        ? `/api/v1/docs/${docId}/preview?page=${page}`
        : `/api/v1/docs/${docId}/preview`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code !== 0) {
        setError(data.message || '预览加载失败');
        return;
      }
      setPreview(data.data);
      if (page) setPdfPage(page);
      setIframeKey(k => k + 1);
    } catch (err) {
      setError((err as Error).message || '预览加载失败');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleDownload = () => {
    window.open(`/api/v1/docs/${docId}/download`, '_blank');
  };

  const handlePrevPage = () => {
    if (pdfPage > 1) fetchPreview(pdfPage - 1);
  };

  const handleNextPage = () => {
    if (preview?.pages && pdfPage < preview.pages) fetchPreview(pdfPage + 1);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">📄</span>
            <h2 className="font-semibold text-gray-900 truncate">{docName}</h2>
            {preview && preview.size > 0 && (
              <span className="text-xs text-gray-500 flex-shrink-0">{formatSize(preview.size)}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* PDF page controls */}
            {preview?.type === 'pdf' && preview.pages && preview.pages > 1 && (
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={handlePrevPage}
                  disabled={pdfPage <= 1}
                  className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded transition"
                >‹</button>
                <span className="text-sm text-gray-600 px-2">
                  {pdfPage} / {preview.pages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={pdfPage >= preview.pages}
                  className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded transition"
                >›</button>
              </div>
            )}
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition flex items-center gap-1"
            >
              ⬇ 下载
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition text-xl leading-none"
            >×</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100">
          {loading && (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="text-gray-500 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p>正在加载预览...</p>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 p-8">
              <div className="text-center">
                <p className="text-4xl mb-3">⚠️</p>
                <p className="text-red-600 font-medium">{error}</p>
                {preview?.message && (
                  <p className="text-gray-500 text-sm mt-1">{preview.message}</p>
                )}
              </div>
              {preview?.url && (
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  下载文件
                </a>
              )}
            </div>
          )}

          {!loading && !error && preview?.type === 'unsupported' && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 p-8">
              <p className="text-5xl">📦</p>
              <div className="text-center">
                <p className="text-gray-700 font-medium">{preview.message || '该文件类型不支持预览'}</p>
                {preview.url && (
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    ⬇ 下载查看
                  </a>
                )}
              </div>
            </div>
          )}

          {!loading && !error && (preview?.type === 'html' || preview?.type === 'code') && preview?.content && (
            <iframe
              key={iframeKey}
              srcDoc={preview.content}
              className="w-full h-full min-h-[500px] border-0"
              sandbox="allow-same-origin"
              title={`preview-${docId}`}
            />
          )}

          {!loading && !error && preview?.type === 'image' && (
            <div className="flex items-center justify-center h-full p-4">
              <img
                src={preview.url}
                alt={docName}
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          )}

          {!loading && !error && preview?.type === 'pdf' && !preview.content && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 p-8">
              <p className="text-5xl">📕</p>
              <div className="text-center">
                <p className="text-gray-700 font-medium">PDF 预览</p>
                <p className="text-gray-500 text-sm mt-1">共 {preview.pages} 页</p>
              </div>
              {preview.url && (
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  在新窗口打开 PDF
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {preview?.type === 'pdf' && preview.pages && preview.pages > 1 && (
          <div className="flex items-center justify-center gap-4 px-4 py-2 border-t bg-gray-50 flex-shrink-0">
            <button
              onClick={handlePrevPage}
              disabled={pdfPage <= 1}
              className="px-4 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
            >上一页</button>
            <span className="text-sm text-gray-600">第 {pdfPage} / {preview.pages} 页</span>
            <button
              onClick={handleNextPage}
              disabled={pdfPage >= preview.pages}
              className="px-4 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
            >下一页</button>
          </div>
        )}
      </div>
    </div>
  );
}

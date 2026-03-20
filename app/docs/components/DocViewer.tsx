'use client';

import { useState, useEffect } from 'react';
import { DocPreviewResult } from '@/lib/api/types';
import { getDocPreview } from '@/lib/api/doc';
import { Loader2, FileText, Image, FileCode, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocViewerProps {
  docId: string;
  className?: string;
}

export function DocViewer({ docId, className = '' }: DocViewerProps) {
  const [preview, setPreview] = useState<DocPreviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadPreview();
  }, [docId, page]);

  const loadPreview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getDocPreview(docId, { page });
      setPreview(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载预览失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500 dark:text-gray-400" />
        <span className="ml-2 text-gray-500 dark:text-gray-400">加载预览中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-96 ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadPreview} variant="outline">重试</Button>
      </div>
    );
  }

  if (!preview || !preview.canPreview) {
    return (
      <div className={`flex flex-col items-center justify-center h-96 bg-gray-50 dark:bg-slate-800 rounded-lg ${className}`}>
        <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 dark:text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-300 mb-2">{preview?.message || '该文件不支持在线预览'}</p>
        {preview?.url && (
          <a
            href={preview.url}
            download
            className="text-blue-600 hover:underline"
          >
            点击下载文件
          </a>
        )}
      </div>
    );
  }

  // Render based on preview type
  switch (preview.type) {
    case 'html':
      return (
        <div className={`h-full ${className}`}>
          {preview.content ? (
            <iframe
              srcDoc={preview.content}
              className="w-full h-full border-0 rounded-lg bg-white"
              sandbox="allow-scripts"
              title="Document Preview"
            />
          ) : preview.url ? (
            <iframe
              src={preview.url}
              className="w-full h-full border-0 rounded-lg bg-white"
              sandbox="allow-scripts"
              title="Document Preview"
            />
          ) : null}
        </div>
      );

    case 'code':
      return (
        <div className={`h-full ${className}`}>
          {preview.content ? (
            <iframe
              srcDoc={preview.content}
              className="w-full h-full border-0 rounded-lg"
              sandbox="allow-scripts"
              title="Code Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-slate-800 rounded-lg">
              <FileCode className="w-8 h-8 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
            </div>
          )}
        </div>
      );

    case 'pdf':
      return (
        <div className={`h-full flex flex-col ${className}`}>
          {preview.pages && preview.pages > 1 && (
            <div className="flex items-center justify-between mb-4 px-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                上一页
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                第 {page} / {preview.pages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(preview.pages || 1, p + 1))}
                disabled={page >= (preview.pages || 1)}
              >
                下一页
              </Button>
            </div>
          )}
          <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden">
            {preview.url ? (
              <iframe
                src={`${preview.url}#page=${page}`}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400">PDF 预览不可用</p>
              </div>
            )}
          </div>        </div>
      );

    case 'image':
      return (
        <div className={`flex items-center justify-center h-full bg-gray-50 dark:bg-slate-800 rounded-lg ${className}`}>
          {preview.url ? (
            <img
              src={preview.url}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : (
            <Image className="w-12 h-12 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
          )}
        </div>
      );

    case 'text':
      return (
        <div className={`h-full ${className}`}>
          {preview.content ? (
            <iframe
              srcDoc={preview.content}
              className="w-full h-full border-0 rounded-lg"
              sandbox="allow-scripts"
              title="Text Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-slate-800 rounded-lg">
              <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className={`flex flex-col items-center justify-center h-96 bg-gray-50 dark:bg-slate-800 rounded-lg ${className}`}>
          <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 dark:text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-300">不支持的文件类型</p>
        </div>
      );
  }
}

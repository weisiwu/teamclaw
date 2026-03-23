'use client';

import { useState, useEffect } from 'react';
import { FileText, Folder, Image as ImageIcon, FileCode, File, Eye, Download, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocSearchBox } from './components/DocSearchBox';
import { DocViewer } from './components/DocViewer';
import { DownloadManager } from './components/DownloadManager';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EnhancedSearchResult } from '@/lib/api/types';

function getFileIcon(type: string) {
  switch (type?.toLowerCase()) {
    case 'md':
    case 'markdown':
    case 'txt':
      return <FileText className="w-8 h-8 text-blue-500" />;
    case 'pdf':
      return <FileText className="w-8 h-8 text-red-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
      return <ImageIcon className="w-8 h-8 text-green-500" />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'java':
    case 'go':
    case 'rs':
    case 'cpp':
    case 'c':
    case 'json':
    case 'yaml':
    case 'yml':
      return <FileCode className="w-8 h-8 text-purple-500" />;
    default:
      return <File className="w-8 h-8 text-gray-400" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function DocsPage() {
  const [docs, setDocs] = useState<EnhancedSearchResult[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<EnhancedSearchResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Handle search results
  const handleSearch = (results: EnhancedSearchResult[]) => {
    setDocs(results);
  };

  // Handle filter change
  const handleFilterChange = () => {
    // Filter changes are handled internally by DocSearchBox
  };

  // Toggle file selection
  const toggleSelection = (docId: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Select all visible docs
  const selectAll = () => {
    if (selectedFiles.size === docs.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(docs.map((d) => d.id)));
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  // Open preview
  const handlePreview = (doc: EnhancedSearchResult) => {
    setSelectedDoc(doc);
    setIsPreviewOpen(true);
  };

  // Initial load
  useEffect(() => {
    handleSearch([]);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">文档库</h1>
        <p className="text-gray-500 dark:text-gray-400">搜索、预览和管理项目文档</p>
      </div>

      {/* Search and filters */}
      <DocSearchBox onSearch={handleSearch} onFilterChange={handleFilterChange} className="mb-6" />

      {/* Actions bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selectedFiles.size === docs.length && docs.length > 0 ? (
              <>
                <CheckSquare className="w-4 h-4 mr-1" />
                取消全选
              </>
            ) : (
              <>
                <Square className="w-4 h-4 mr-1" />
                全选
              </>
            )}
          </Button>
          {selectedFiles.size > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">已选择 {selectedFiles.size} 项</span>
          )}
        </div>

        <DownloadManager
          selectedFiles={Array.from(selectedFiles)}
          onClearSelection={clearSelection}
        />
      </div>

      {/* Doc list */}
      <div className="border rounded-lg divide-y">
        {docs.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">
            <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>使用上方搜索框查找文档</p>
          </div>
        ) : (
          docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <button onClick={() => toggleSelection(doc.id)} className="flex-shrink-0">
                {selectedFiles.has(doc.id) ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                )}
              </button>

              <div className="flex-shrink-0">{getFileIcon(doc.metadata?.fileType as string)}</div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{doc.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{doc.snippet}</p>
                <div className="flex items-center gap-2 mt-1">
                  {doc.metadata?.fileType && (
                    <Badge variant="info" className="text-xs">
                      {String(doc.metadata.fileType).toUpperCase()}
                    </Badge>
                  )}
                  {doc.metadata?.size && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatFileSize(Number(doc.metadata.size))}</span>
                  )}
                  {doc.metadata?.uploadedAt && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(String(doc.metadata.uploadedAt)).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handlePreview(doc)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <a href={`/api/v1/docs/${doc.id}/download`} download>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[500px] mt-4">
            {selectedDoc && <DocViewer docId={selectedDoc.id} className="h-[500px]" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

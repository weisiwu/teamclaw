'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface SearchHistoryItem {
  id: string;
  query: string;
  type: string;
  resultCount: number;
  createdAt: string;
}

interface SearchFilter {
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
  sizeMin?: number;
  sizeMax?: number;
}

interface DocSearchBoxProps {
  onSearch: (query: string, filter: SearchFilter) => void;
  defaultQuery?: string;
  defaultFilter?: SearchFilter;
  placeholder?: string;
}

const FILE_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'md', label: '📝 Markdown' },
  { value: 'txt', label: '📄 文本' },
  { value: 'pdf', label: '📕 PDF' },
  { value: 'json', label: '{ } JSON' },
  { value: 'code', label: '💻 代码' },
  { value: 'image', label: '🖼️ 图片' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function DocSearchBox({
  onSearch,
  defaultQuery = '',
  defaultFilter = {},
  placeholder = '搜索文档...',
}: DocSearchBoxProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [mode, setMode] = useState<'keyword' | 'semantic'>('keyword');
  const [filter, setFilter] = useState<SearchFilter>(defaultFilter);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch search history
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/search/history?userId=default&limit=10');
      const data = await res.json();
      if (data.code === 0) setHistory(data.data?.history || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Close history on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    onSearch(query, filter);
    setShowHistory(false);
    // Refresh history after search
    setTimeout(fetchHistory, 1000);
  }, [query, filter, onSearch, fetchHistory]);

  const handleHistoryClick = (item: SearchHistoryItem) => {
    setQuery(item.query);
    onSearch(item.query, filter);
    setShowHistory(false);
  };

  const handleClearHistory = async () => {
    try {
      await fetch('/api/v1/search/history?userId=default', { method: 'DELETE' });
      setHistory([]);
    } catch { /* ignore */ }
  };

  const handleFilterChange = (key: keyof SearchFilter, value: string | number | undefined) => {
    const newFilter = { ...filter, [key]: value || undefined };
    setFilter(newFilter);
    // Auto-trigger search when filters change
    onSearch(query, newFilter);
  };

  const handleReset = () => {
    setQuery('');
    setFilter({});
    onSearch('', {});
    setShowFilters(false);
  };

  const hasActiveFilters = filter.type || filter.dateFrom || filter.dateTo || filter.sizeMin || filter.sizeMax;

  return (
    <div ref={containerRef} className="relative">
      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        {/* Mode Toggle */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => setMode('keyword')}
            className={`px-3 py-2 text-sm font-medium transition ${
              mode === 'keyword' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >关键词</button>
          <button
            type="button"
            onClick={() => setMode('semantic')}
            className={`px-3 py-2 text-sm font-medium transition ${
              mode === 'semantic' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >🤖 语义</button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}
            placeholder={placeholder}
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >×</button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(f => !f)}
          className={`px-3 py-2 border rounded-lg text-sm font-medium transition flex items-center gap-1 ${
            hasActiveFilters
              ? 'bg-blue-50 border-blue-300 text-blue-600'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          🔍 筛选 {hasActiveFilters && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
        </button>

        {/* Submit */}
        <button
          type="submit"
          className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium text-sm"
        >搜索</button>
      </form>

      {/* Search History Dropdown */}
      {showHistory && history.length > 0 && !query && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
            <span className="text-xs text-gray-500 font-medium">最近搜索</span>
            <button onClick={handleClearHistory} className="text-xs text-red-500 hover:text-red-600">清除</button>
          </div>
          {history.map(item => (
            <button
              key={item.id}
              onClick={() => handleHistoryClick(item)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between gap-2 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-400 flex-shrink-0">{item.type === 'semantic' ? '🤖' : '🔤'}</span>
                <span className="truncate text-sm text-gray-800">{item.query}</span>
                {item.resultCount > 0 && (
                  <span className="text-xs text-gray-400 flex-shrink-0">{item.resultCount}条结果</span>
                )}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(item.createdAt)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* File Type */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">文件类型</label>
              <select
                value={filter.type || ''}
                onChange={e => handleFilterChange('type', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {FILE_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">开始日期</label>
              <input
                type="date"
                value={filter.dateFrom || ''}
                onChange={e => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">结束日期</label>
              <input
                type="date"
                value={filter.dateTo || ''}
                onChange={e => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Min Size */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">最小大小</label>
              <select
                value={filter.sizeMin || ''}
                onChange={e => {
                  const val = e.target.value;
                  handleFilterChange('sizeMin', val ? parseInt(val) : undefined);
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">不限</option>
                <option value="1024">≥ 1KB</option>
                <option value="10240">≥ 10KB</option>
                <option value="102400">≥ 100KB</option>
                <option value="1048576">≥ 1MB</option>
              </select>
            </div>

            {/* Max Size */}
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">最大大小</label>
              <select
                value={filter.sizeMax || ''}
                onChange={e => {
                  const val = e.target.value;
                  handleFilterChange('sizeMax', val ? parseInt(val) : undefined);
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">不限</option>
                <option value="1024">≤ 1KB</option>
                <option value="10240">≤ 10KB</option>
                <option value="102400">≤ 100KB</option>
                <option value="1048576">≤ 1MB</option>
                <option value="10485760">≤ 10MB</option>
              </select>
            </div>
          </div>

          {/* Active filters summary + reset */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <div className="flex flex-wrap gap-1">
                {filter.type && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    类型:{filter.type}
                  </span>
                )}
                {filter.dateFrom && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    从:{filter.dateFrom}
                  </span>
                )}
                {filter.dateTo && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    至:{filter.dateTo}
                  </span>
                )}
                {filter.sizeMin && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    ≥{formatSize(filter.sizeMin)}
                  </span>
                )}
                {filter.sizeMax && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    ≤{formatSize(filter.sizeMax)}
                  </span>
                )}
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-red-500 hover:text-red-600"
              >重置筛选</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

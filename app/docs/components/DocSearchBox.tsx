'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X, History, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { searchDocs, getSearchSuggestions, getSearchHistory } from '@/lib/api/search';
import { SearchFilter, SearchHistoryRecord, EnhancedSearchResult } from '@/lib/api/types';

interface DocSearchBoxProps {
  onSearch?: (results: EnhancedSearchResult[]) => void;
  onFilterChange?: (filter: SearchFilter) => void;
  className?: string;
}

const FILE_TYPES = [
  { value: '', label: '所有类型' },
  { value: 'md', label: 'Markdown' },
  { value: 'pdf', label: 'PDF' },
  { value: 'txt', label: '文本' },
  { value: 'code', label: '代码' },
  { value: 'image', label: '图片' },
];

export function DocSearchBox({ onSearch, onFilterChange, className = '' }: DocSearchBoxProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'keyword' | 'semantic'>('keyword');
  const [filter, setFilter] = useState<SearchFilter>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<SearchHistoryRecord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Check if any filters are active
  useEffect(() => {
    setHasActiveFilters(
      Object.values(filter).some(v => v !== undefined && v !== '')
    );
  }, [filter]);

  // Load search history
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const h = await getSearchHistory(undefined, 10);
      setHistory(h);
    } catch {
      // ignore
    }
  };

  // Debounced search suggestions
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const s = await getSearchSuggestions(query, 5);
        setSuggestions(s);
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    setShowSuggestions(false);
    try {
      const results = await searchDocs({
        q: query,
        mode,
        ...filter,
        pageSize: 20,
      });
      onSearch?.(results.list);
      // Refresh history after search
      loadHistory();
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [query, mode, filter, onSearch]);

  const handleFilterChange = (key: keyof SearchFilter, value: string | number | undefined) => {
    const newFilter = { ...filter, [key]: value || undefined };
    setFilter(newFilter);
    onFilterChange?.(newFilter);
  };

  const clearFilters = () => {
    setFilter({});
    onFilterChange?.({});
  };

  const applyHistoryItem = (item: SearchHistoryRecord) => {
    setQuery(item.query);
    setMode(item.type as 'keyword' | 'semantic');
    if (item.filters) {
      setFilter(item.filters);
    }
    handleSearch();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main search bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="搜索文档..."
              className="pl-10 pr-4"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && (suggestions.length > 0 || history.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50">
                {suggestions.length > 0 && (
                  <div className="p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-2">搜索建议</p>
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuery(s);
                          setShowSuggestions(false);
                          handleSearch();
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-sm"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {history.length > 0 && (
                  <div className="border-t p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-2 flex items-center gap-1">
                      <History className="w-3 h-3" /> 搜索历史
                    </p>
                    {history.slice(0, 5).map((h) => (
                      <button
                        key={h.id}
                        onClick={() => {
                          applyHistoryItem(h);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-gray-100 rounded text-sm flex items-center justify-between"
                      >
                        <span>{h.query}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {h.type === 'semantic' ? '语义' : '关键词'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Select value={mode} onValueChange={(v) => setMode(v as 'keyword' | 'semantic')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keyword">关键词</SelectItem>
              <SelectItem value="semantic">语义搜索</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                筛选
                {hasActiveFilters && (
                  <Badge variant="info" className="ml-1">!</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">筛选条件</h4>

                <div className="space-y-2">
                  <label className="text-sm">文件类型</label>
                  <Select
                    value={filter.type || ''}
                    onValueChange={(v) => handleFilterChange('type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm">上传时间</label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={filter.dateFrom || ''}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      placeholder="开始日期"
                    />
                    <Input
                      type="date"
                      value={filter.dateTo || ''}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      placeholder="结束日期"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm">文件大小 (MB)</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={filter.sizeMin ? Math.round(filter.sizeMin / 1024 / 1024) : ''}
                      onChange={(e) => {
                        const mb = parseInt(e.target.value);
                        handleFilterChange('sizeMin', mb ? mb * 1024 * 1024 : undefined);
                      }}
                      placeholder="最小"
                    />
                    <Input
                      type="number"
                      value={filter.sizeMax ? Math.round(filter.sizeMax / 1024 / 1024) : ''}
                      onChange={(e) => {
                        const mb = parseInt(e.target.value);
                        handleFilterChange('sizeMax', mb ? mb * 1024 * 1024 : undefined);
                      }}
                      placeholder="最大"
                    />
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    清除筛选
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? '搜索中...' : '搜索'}
          </Button>
        </div>

        {/* Active filter badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-2">
            {filter.type && (
              <Badge variant="info" className="gap-1">
                类型: {FILE_TYPES.find(t => t.value === filter.type)?.label}
                <button onClick={() => handleFilterChange('type', undefined)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {(filter.dateFrom || filter.dateTo) && (
              <Badge variant="info" className="gap-1">
                <Clock className="w-3 h-3" />
                {filter.dateFrom || '开始'} ~ {filter.dateTo || '结束'}
                <button onClick={() => { handleFilterChange('dateFrom', undefined); handleFilterChange('dateTo', undefined); }}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

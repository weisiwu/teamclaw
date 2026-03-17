'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface DocMeta {
  slug: string;
  title: string;
  description?: string;
  category?: string;
  created?: string;
  updated?: string;
}

interface Stats {
  totalDocs: number;
  weeklyUpdates: number;
  categories: string[];
}

interface DocsPageClientProps {
  initialDocs: DocMeta[];
  stats: Stats;
}

type SortOption = 'name' | 'created' | 'updated';

export default function DocsPageClient({ initialDocs, stats }: DocsPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categoryOptions = useMemo(() => {
    const opts = [{ value: 'all', label: '全部分类' }];
    stats.categories.forEach(cat => {
      opts.push({ value: cat, label: cat });
    });
    return opts;
  }, [stats.categories]);

  const sortOptions = [
    { value: 'name', label: '按名称' },
    { value: 'created', label: '按创建时间' },
    { value: 'updated', label: '按更新时间' },
  ];

  const filteredAndSortedDocs = useMemo(() => {
    let result = [...initialDocs];

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter(doc => doc.category === categoryFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title, 'zh-CN');
        case 'created':
          if (!a.created || !b.created) return 0;
          return new Date(b.created).getTime() - new Date(a.created).getTime();
        case 'updated':
          if (!a.updated || !b.updated) return 0;
          return new Date(b.updated).getTime() - new Date(a.updated).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [initialDocs, searchQuery, sortBy, categoryFilter]);

  const handleDownload = async (slug: string, title: string) => {
    try {
      const response = await fetch(`/api/download?slug=${encodeURIComponent(slug)}`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">文档中心</h1>

      {/* Statistics */}
      <div className="bg-white rounded-xl border p-4 mb-6">
        <div className="flex gap-6">
          <div>
            <p className="text-sm text-gray-500">文档总数</p>
            <p className="text-2xl font-bold">{stats.totalDocs}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">本周更新</p>
            <p className="text-2xl font-bold text-green-600">{stats.weeklyUpdates}</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Input
          type="text"
          placeholder="搜索文档..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />

        {/* Category Filter */}
        <Select
          options={categoryOptions}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />

        {/* Sort */}
        <Select
          options={sortOptions}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        />
      </div>

      {initialDocs.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          <p>暂无文档</p>
        </div>
      ) : filteredAndSortedDocs.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          <p>暂无匹配文档</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedDocs.map((doc) => (
            <Card key={doc.slug} className="h-full hover:shadow-md transition-shadow">
              <Link href={`/docs/${doc.slug}`} className="block h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{doc.title}</CardTitle>
                  {doc.category && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {doc.category}
                    </span>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {doc.description || '点击查看详情'}
                  </p>
                  {(doc.created || doc.updated) && (
                    <p className="text-xs text-gray-400 mt-2">
                      {doc.updated ? `更新: ${doc.updated}` : doc.created ? `创建: ${doc.created}` : ''}
                    </p>
                  )}
                </CardContent>
              </Link>
              <CardFooter className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDownload(doc.slug, doc.title);
                  }}
                >
                  下载
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DocMeta {
  slug: string;
  title: string;
  description?: string;
}

interface DocsPageClientProps {
  initialDocs: DocMeta[];
}

export default function DocsPageClient({ initialDocs }: DocsPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) {
      return initialDocs;
    }
    const query = searchQuery.toLowerCase();
    return initialDocs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
    );
  }, [initialDocs, searchQuery]);

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

      {/* Search Input */}
      <div className="mb-6">
        <Input
          type="text"
          placeholder="搜索文档..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {initialDocs.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          <p>暂无文档</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          <p>暂无匹配文档</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc) => (
            <Card key={doc.slug} className="h-full hover:shadow-md transition-shadow">
              <Link href={`/docs/${doc.slug}`} className="block h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{doc.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {doc.description || '点击查看详情'}
                  </p>
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

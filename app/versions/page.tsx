'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import type { GitTag } from '@/lib/api/types';
import { useTags } from '@/lib/api/tags';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Tag,
  Search,
  Loader2,
  RefreshCw,
  Calendar,
  User,
  Download,
  GitBranch,
  Clock,
  ChevronRight,
  GitCommit,
  Package,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  active:    { label: '活跃',   dot: 'bg-emerald-500',    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  archived:  { label: '已归档', dot: 'bg-gray-400',        badge: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
  protected: { label: '保护中', dot: 'bg-amber-500',      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
};

const BUILD_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  success:  { label: '构建成功', dot: 'bg-emerald-500',    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700' },
  failed:   { label: '构建失败', dot: 'bg-red-500',        badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700' },
  building: { label: '构建中',  dot: 'bg-blue-500 animate-pulse', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700' },
  pending:  { label: '待构建',  dot: 'bg-gray-400',        badge: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' },
};

const DATE_PRESETS = [
  { label: '全部', value: 'all' },
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' },
  { label: '近90天', value: '90d' },
];

const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isWithinDays(iso: string, days: number) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return (now - then) <= days * 86_400_000;
}

// ─── Version Timeline Node ────────────────────────────────────────────────────

function VersionTimelineNode({ tag }: { tag: GitTag }) {
  const status = STATUS_CONFIG[tag.status] ?? STATUS_CONFIG.active;
  const build  = tag.buildStatus ? BUILD_CONFIG[tag.buildStatus] : null;

  return (
    <div className="relative pl-10 sm:pl-12">
      {/* Vertical timeline line */}
      <div className="absolute left-[15px] sm:left-[17px] top-2 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 dark:from-blue-700 via-blue-100 dark:via-blue-900 to-transparent" />

      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-400 dark:border-blue-500 flex items-center justify-center shadow-sm z-10">
        <div className={cn('w-2.5 h-2.5 rounded-full', status.dot)} />
      </div>

      {/* Version card */}
      <Card className="mb-4 hover:shadow-md transition-shadow border-l-4 border-l-blue-400">
        <CardContent className="p-5">
          {/* Header: version name + badges */}
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-xl text-foreground">{tag.name}</span>
              <span className="text-sm text-muted-foreground font-mono">({tag.version})</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', status.badge)}>
                {status.label}
              </span>
              {build && (
                <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', build.badge)}>
                  <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1', build.dot)} />
                  {build.label}
                </span>
              )}
              {tag.hasScreenshot && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700 font-medium">
                  📷 含截图
                </span>
              )}
              {tag.hasChangelog && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700 font-medium">
                  📋 变更日志
                </span>
              )}
            </div>
            <Link href={`/versions/${encodeURIComponent(tag.name)}`}>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                详情 <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Commit message */}
          <div className="bg-muted/60 rounded-lg p-3 mb-4">
            <p className="text-sm text-foreground leading-relaxed">{tag.subject}</p>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <GitCommit className="w-3.5 h-3.5" />
              <code className="font-mono bg-muted px-1 rounded">{tag.commit}</code>
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />{tag.author}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />{formatDateTime(tag.taggerDate)}
            </span>
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />{tag.projectName}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            <Link href={`/versions/${encodeURIComponent(tag.name)}`}>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Tag className="w-3.5 h-3.5" />查看详情
              </Button>
            </Link>
            <Link href={`/versions/${encodeURIComponent(tag.name)}?tab=changelog`}>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                <Download className="w-3.5 h-3.5" />下载/变更
              </Button>
            </Link>
            <Link href={`/versions/${encodeURIComponent(tag.name)}?tab=build`}>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />构建信息
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VersionsPage() {
  const { data, isLoading, error, refetch, isRefetching } = useTags();

  const [searchQuery, setSearchQuery]   = useState('');
  const [sortOrder, setSortOrder]       = useState<'newest' | 'oldest'>('newest');
  const [statusFilter, setStatusFilter] = useState<'all' | GitTag['status']>('all');
  const [datePreset, setDatePreset]     = useState<string>('all');
  const [currentPage, setCurrentPage]   = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);

  const tags = useMemo(() => data?.data ?? [], [data]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOrder, statusFilter, datePreset]);

  const filteredTags = useMemo(() => {
    let result = tags;

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.version.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.author.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    // Date preset filter
    if (datePreset !== 'all') {
      const days = parseInt(datePreset);
      if (!isNaN(days)) {
        result = result.filter(t => isWithinDays(t.taggerDate, days));
      }
    }

    // Sort
    result = [...result].sort((a, b) => {
      const ta = new Date(a.taggerDate).getTime();
      const tb = new Date(b.taggerDate).getTime();
      return sortOrder === 'newest' ? tb - ta : ta - tb;
    });

    return result;
  }, [tags, searchQuery, sortOrder, statusFilter, datePreset]);

  const totalPages = Math.ceil(filteredTags.length / PAGE_SIZE);
  const pageTags = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTags.slice(start, start + PAGE_SIZE);
  }, [filteredTags, currentPage]);

  return (
    <div className="page-container py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">版本时间线</h1>
            <p className="text-sm text-muted-foreground">
              {totalPages > 1
                ? `第 ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredTags.length)} / 共 ${filteredTags.length} 个版本`
                : `共 ${filteredTags.length} 个版本（${tags.length} 个标签）`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? '刷新中' : '刷新'}
          </Button>
          <Link href="/versions/new">
            <Button size="sm" className="gap-1.5">
              <Tag className="w-4 h-4" />新建版本
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索版本号、备注、作者..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Sort */}
            <Button
              variant={sortOrder === 'newest' ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setSortOrder(o => o === 'newest' ? 'oldest' : 'newest')}
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder === 'newest' ? '最新优先' : '最旧优先'}
            </Button>

            {/* Status filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-muted-foreground" />
              {(['all', 'active', 'archived', 'protected'] as const).map(s => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                  className="h-8 text-xs"
                >
                  {s === 'all' ? '全部' : STATUS_CONFIG[s]?.label ?? s}
                </Button>
              ))}
            </div>

            {/* Date presets */}
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              {DATE_PRESETS.map(p => (
                <Button
                  key={p.value}
                  variant={datePreset === p.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDatePreset(p.value)}
                  className="h-8 text-xs"
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-muted-foreground">加载版本数据...</span>
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-medium mb-2">加载失败</p>
            <p className="text-sm text-red-500">{String(error)}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />重试
            </Button>
          </CardContent>
        </Card>
      ) : filteredTags.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="暂无版本"
          description={searchQuery || statusFilter !== 'all' || datePreset !== 'all'
            ? '没有符合筛选条件的版本，试试调整筛选条件'
            : '还没有创建任何版本标签'}
          action={searchQuery || statusFilter !== 'all' || datePreset !== 'all' ? (
            <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setDatePreset('all'); }}>
              清除筛选
            </Button>
          ) : (
            <Link href="/versions/new">
              <Button size="sm" className="gap-1.5"><Tag className="w-4 h-4" />创建第一个版本</Button>
            </Link>
          )}
        />
      ) : (
        <div>
          {isRefetching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />正在刷新...
            </div>
          )}
          <div ref={timelineRef}>
            <VersionTimelineNode tag={pageTags[0]} />
            {pageTags.slice(1).map(tag => (
              <VersionTimelineNode key={tag.name} tag={tag} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentPage(p => Math.max(1, p - 1));
                  timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                disabled={currentPage === 1}
              >
                ← 上一页
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'ghost'}
                      size="sm"
                      className="w-9"
                      onClick={() => {
                        setCurrentPage(page);
                        timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentPage(p => Math.min(totalPages, p + 1));
                  timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                disabled={currentPage === totalPages}
              >
                下一页 →
              </Button>
              <span className="text-xs text-muted-foreground ml-2">
                第 {currentPage} / {totalPages} 页
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

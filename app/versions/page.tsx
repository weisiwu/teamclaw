'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Version, GitTag } from '@/lib/api/types';
import {
  BUILD_STATUS_LABELS,
  BUILD_STATUS_BADGE_VARIANT,
  VERSION_STATUS_OPTIONS,
  VERSION_STATUS_LABELS,
  VERSION_STATUS_BADGE_VARIANT as VERSION_STATUS_BADGE,
} from '@/lib/api/constants';
import { getVersions } from '@/lib/api/versions';
import { compareVersions } from '@/lib/api/versionCompare';
import { useTags } from '@/lib/api/tags';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { LegacySelect } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Tag,
  Star,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  AlertTriangle,
  RefreshCw,
  Package,
  TrendingUp,
  GitCommit,
  CheckCircle2,
  GitCompare,
  X,
  Check,
  GitBranch,
  LayoutDashboard,
  Grid3X3,
  ArrowUpDown,
  Hash,
  User,
  Calendar,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ─── Version Panel Tab Content ────────────────────────────────────────────────
function TagCardInline({ tag, build, expandedTags, toggleExpand }: {
  tag: GitTag;
  build: { label: string; dot: string; bg: string } | null;
  expandedTags: Set<string>;
  toggleExpand: (name: string) => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-500',
    protected: 'bg-amber-100 text-amber-700',
  };

  return (
    <div
      className="border rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all bg-white cursor-pointer"
      onClick={() => router.push(`/versions?tag=${encodeURIComponent(tag.name)}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="w-4 h-4 text-blue-600 mt-0.5" />
          <span className="font-mono font-bold text-foreground text-lg">{tag.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColors[tag.status]}`}>
            {tag.status === 'active' ? '活跃' : tag.status === 'archived' ? '已归档' : '保护中'}
          </span>
          {build && (
            <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${build.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${build.dot}`} />
              {build.label}
            </span>
          )}
        </div>
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={e => { e.stopPropagation(); toggleExpand(tag.name); }}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${expandedTags.has(tag.name) ? 'rotate-90' : ''}`} />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-2">版本：{tag.version}</p>
      <div className="bg-muted/50 rounded-lg p-3 mb-3">
        <p className="text-sm line-clamp-2">{tag.subject}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Hash className="w-3 h-3" /><span className="font-mono">{tag.commit}</span></span>
        <span className="flex items-center gap-1"><User className="w-3 h-3" />{tag.author}</span>
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(tag.taggerDate).toLocaleDateString('zh-CN')}</span>
      </div>
      {expandedTags.has(tag.name) && (
        <div className="mt-4 pt-4 border-t space-y-2" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between bg-muted rounded-lg p-2">
            <span className="text-xs font-mono">{tag.commitHash}</span>
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => { navigator.clipboard.writeText(tag.commitHash); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              {copied ? <span className="text-xs text-green-600">已复制</span> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <a href={`/versions?tag=${encodeURIComponent(tag.name)}`} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium" onClick={e => e.stopPropagation()}>
              <ExternalLink className="w-3 h-3" />查看版本详情
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function VersionPanelContent() {
  const router = useRouter();
  const { data, isLoading, error, refetch, isRefetching } = useTags();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [statusFilter, setStatusFilter] = useState<'all' | GitTag['status']>('all');
  const [metaFilter, setMetaFilter] = useState<'all' | 'hasScreenshot' | 'hasChangelog'>('all');
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());

  const tags = useMemo(() => data?.data || [], [data]);

  const filteredTags = useMemo(() => {
    const result = tags.filter(tag => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !tag.name.toLowerCase().includes(query) &&
          !tag.version.toLowerCase().includes(query) &&
          !tag.subject.toLowerCase().includes(query) &&
          !tag.author.toLowerCase().includes(query)
        ) return false;
      }
      if (statusFilter !== 'all' && tag.status !== statusFilter) return false;
      if (metaFilter === 'hasScreenshot' && !tag.hasScreenshot) return false;
      if (metaFilter === 'hasChangelog' && !tag.hasChangelog) return false;
      return true;
    });
    result.sort((a, b) => {
      const dateA = new Date(a.taggerDate).getTime();
      const dateB = new Date(b.taggerDate).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [tags, searchQuery, sortOrder, statusFilter, metaFilter]);

  const toggleExpand = (name: string) => {
    setExpandedTags(prev => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      return next;
    });
  };

  const buildStatusConfig: Record<string, { label: string; dot: string; bg: string }> = {
    success: { label: '构建成功', dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    failed: { label: '构建失败', dot: 'bg-red-500', bg: 'bg-red-50 text-red-700 border-red-200' },
    building: { label: '构建中', dot: 'bg-blue-500 animate-pulse', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    pending: { label: '待构建', dot: 'bg-gray-400', bg: 'bg-gray-50 text-gray-600 border-gray-200' },
  };

  return (
    <div className="space-y-6">
      {/* Panel Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Tag className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">版本面板</h2>
          <Badge variant="outline">{filteredTags.length} 个标签</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? '刷新中...' : '刷新'}
          </Button>
          <div className="flex border rounded-lg overflow-hidden">
            {[['grid', Grid3X3], ['list', List]].map(([mode, Icon]) => (
              <button
                key={mode}
                className={`p-2 ${viewMode === mode ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                onClick={() => setViewMode(mode as 'grid' | 'list')}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setSortOrder(o => o === 'newest' ? 'oldest' : 'newest')}>
            <ArrowUpDown className="w-4 h-4 mr-1" />
            {sortOrder === 'newest' ? '最新优先' : '最早优先'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索标签名、版本号..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearchQuery('')}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | GitTag['status'])}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="all">全部状态</option>
          <option value="active">活跃</option>
          <option value="archived">已归档</option>
          <option value="protected">保护中</option>
        </select>
        <select
          value={metaFilter}
          onChange={e => setMetaFilter(e.target.value as 'all' | 'hasScreenshot' | 'hasChangelog')}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="all">全部标签</option>
          <option value="hasScreenshot">📎 有截图</option>
          <option value="hasChangelog">📝 有摘要</option>
        </select>
        {(searchQuery || statusFilter !== 'all' || metaFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setMetaFilter('all'); }}>
            <X className="w-4 h-4 mr-1" />清除筛选
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">加载中...</span>
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 flex flex-col items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <p className="text-red-700 font-medium">加载失败</p>
            <p className="text-sm text-red-600">{String(error)}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>重试</Button>
          </CardContent>
        </Card>
      ) : filteredTags.length === 0 ? (
        <EmptyState icon={Tag} title="暂无标签" description="发布版本后自动创建" />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTags.map(tag => {
            const build = tag.buildStatus ? buildStatusConfig[tag.buildStatus] : null;
            return <TagCardInline key={tag.name} tag={tag} build={build} expandedTags={expandedTags} toggleExpand={toggleExpand} />;
          })}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <div className="flex items-center gap-4 px-4 py-3 bg-muted text-sm font-medium text-muted-foreground min-w-[640px]">
            <Tag className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1">标签 / 版本 / 提交信息</div>
            <div className="w-24 text-right flex-shrink-0 hidden sm:block">Hash</div>
            <div className="w-20 flex-shrink-0 hidden sm:block">作者</div>
            <div className="w-24 text-right flex-shrink-0 hidden md:block">日期</div>
          </div>
          {filteredTags.map(tag => (
            <div
              key={tag.name}
              className="flex items-center gap-4 px-4 py-3 border-t hover:bg-muted/50 cursor-pointer transition-colors min-w-[640px]"
              onClick={() => router.push(`/versions?tag=${encodeURIComponent(tag.name)}`)}
            >
              <Tag className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-medium">{tag.name}</span>
                  <span className="text-sm text-muted-foreground">{tag.version}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{tag.subject}</p>
              </div>
              <span className="font-mono text-xs text-muted-foreground flex-shrink-0 hidden sm:block">{tag.commit}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">{tag.author}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0 hidden md:block">{new Date(tag.taggerDate).toLocaleDateString('zh-CN')}</span>
            </div>
          ))}
        </div>
      )}
      <div className="text-sm text-muted-foreground text-center">
        显示 {filteredTags.length} / {tags.length} 个标签
      </div>
    </div>
  );
}

// ─── Branches Tab Content ─────────────────────────────────────────────────────
function BranchesContent() {
  const [BranchManager, setBranchManager] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    import('@/components/versions/BranchManager')
      .then(mod => setBranchManager(() => mod.BranchManager))
      .catch(() => setLoadError('组件加载失败'));
  }, []);

  if (loadError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-8 flex flex-col items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <p className="text-red-700 font-medium">{loadError}</p>
        </CardContent>
      </Card>
    );
  }

  if (!BranchManager) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">加载中...</span>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)]">
      <BranchManager />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function VersionsPage() {
  const [activeTab, setActiveTab] = useState('list');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<{ data: Version[]; total: number; totalPages: number } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');
  const [pageSize, setPageSize] = useState(20);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [compareResult, setCompareResult] = useState<Awaited<
    ReturnType<typeof compareVersions>
  > | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    getVersions(page, pageSize, statusFilter)
      .then(res => {
        setData(res);
        setLastRefreshed(new Date());
      })
      .catch(err => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setIsLoading(false));
  }, [page, statusFilter, pageSize]);

  // 自动刷新：每 30 秒重新获取数据（仅列表 Tab 激活时）
  useEffect(() => {
    if (activeTab !== 'list') return;
    const interval = setInterval(() => {
      setIsLoading(true);
      setError(null);
      getVersions(page, pageSize, statusFilter)
        .then(res => {
          setData(res);
          setLastRefreshed(new Date());
        })
        .catch(err => setError(err instanceof Error ? err : new Error(String(err))))
        .finally(() => setIsLoading(false));
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, page, statusFilter, pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1); // reset to first page when changing page size
  };

  const versions = data?.data || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  const filtered = search
    ? versions.filter(
        v =>
          v.version.toLowerCase().includes(search.toLowerCase()) ||
          v.title.toLowerCase().includes(search.toLowerCase()) ||
          v.description?.toLowerCase().includes(search.toLowerCase())
      )
    : versions;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-6">
          <h1 className="page-header-title">版本管理</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="gap-1">
              <TabsTrigger value="list" className="gap-1.5 text-sm">
                <GitBranch className="w-4 h-4" />
                版本列表
              </TabsTrigger>
              <TabsTrigger value="panel" className="gap-1.5 text-sm">
                <LayoutDashboard className="w-4 h-4" />
                版本面板
              </TabsTrigger>
              <TabsTrigger value="branches" className="gap-1.5 text-sm">
                <GitBranch className="w-4 h-4" />
                分支管理
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          {compareMode ? (
            <>
              <span className="text-sm text-muted-foreground">
                已选择 {selectedVersions.length} 个版本
              </span>
              <Button
                variant="default"
                size="sm"
                className="gap-1.5"
                disabled={selectedVersions.length !== 2}
                onClick={async () => {
                  if (selectedVersions.length !== 2) return;
                  setCompareDialogOpen(true);
                  setCompareLoading(true);
                  setCompareError(null);
                  try {
                    const v1 = versions.find(v => v.id === selectedVersions[0]);
                    const v2 = versions.find(v => v.id === selectedVersions[1]);
                    if (!v1 || !v2) throw new Error('Version not found');
                    const result = await compareVersions(v1.version, v2.version, v1.id, v2.id);
                    setCompareResult(result);
                  } catch (err) {
                    setCompareError(err instanceof Error ? err.message : String(err));
                  } finally {
                    setCompareLoading(false);
                  }
                }}
              >
                <GitCompare className="w-4 h-4" />
                对比
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCompareMode(false);
                  setSelectedVersions([]);
                }}
              >
                <X className="w-4 h-4" />
                取消
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setCompareMode(true)}
            >
              <GitCompare className="w-4 h-4" />
              版本对比
            </Button>
          )}
          <Link href="/versions/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              创建版本
            </Button>
          </Link>
        </div>
      </div>
      <TabsContent value="list">

      {/* Stats Summary Bar */}
      {isLoading ? (
        <div className="page-section mb-4 flex items-center gap-6 flex-wrap">
          {[
            { icon: Package, label: '版本总数', valueClass: 'w-8 h-4 bg-muted rounded' },
            { icon: TrendingUp, label: '构建成功率', valueClass: 'w-10 h-4 bg-muted rounded' },
            { icon: GitCommit, label: '平均提交', valueClass: 'w-8 h-4 bg-muted rounded' },
            { icon: CheckCircle2, label: '已发布', valueClass: 'w-6 h-4 bg-muted rounded' },
            { icon: null, label: '草稿', valueClass: 'w-4 h-4 bg-muted rounded' },
            { icon: null, label: '归档', valueClass: 'w-6 h-4 bg-muted rounded' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 animate-pulse">
              {item.icon && <item.icon className="w-4 h-4 text-muted-foreground/40" />}
              <span className="text-sm text-muted-foreground/60">{item.label}</span>
              <div className={item.valueClass} />
            </div>
          ))}
        </div>
      ) : !error && total > 0 && (() => {
          const successBuilds = versions.filter(v => v.buildStatus === 'success').length;
          const failedBuilds = versions.filter(v => v.buildStatus === 'failed').length;
          const totalBuilds = successBuilds + failedBuilds;
          const successRate = totalBuilds > 0 ? Math.round((successBuilds / totalBuilds) * 100) : 0;
          const avgCommits =
            versions.length > 0
              ? Math.round(versions.reduce((sum, v) => sum + v.commitCount, 0) / versions.length)
              : 0;
          const publishedCount = versions.filter(v => v.status === 'published').length;
          const draftCount = versions.filter(v => v.status === 'draft').length;
          const archivedCount = versions.filter(v => v.status === 'archived').length;
          const publishRate =
            versions.length > 0 ? Math.round((publishedCount / versions.length) * 100) : 0;
          return (
            <div className="page-section mb-4 flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">版本总数</span>
                <span className="text-sm font-semibold">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-500" />
                <span className="text-sm text-muted-foreground">构建成功率</span>
                <span
                  className={`text-sm font-semibold ${successRate >= 80 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}
                >
                  {totalBuilds > 0 ? `${successRate}%` : '—'}
                </span>
                {totalBuilds > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({successBuilds}成功/{failedBuilds}失败)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">平均提交</span>
                <span className="text-sm font-semibold">{avgCommits} 次</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">已发布</span>
                <span className="text-sm font-semibold text-green-600">{publishedCount}</span>
                <span className="text-xs text-muted-foreground">({publishRate}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">草稿</span>
                <span className="text-sm font-semibold">{draftCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">归档</span>
                <span className="text-sm font-semibold text-yellow-600">{archivedCount}</span>
              </div>
              {lastRefreshed && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                  <RefreshCw className="w-3 h-3" />
                  <span>自动刷新于 {lastRefreshed.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              )}
            </div>
          );
        })()}

      {/* Results indicator when filtering */}
      {search && (
        <div className="page-section mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <span>搜索结果: </span>
          <span className="font-medium text-foreground">{filtered.length}</span>
          <span>/ {versions.length} 条</span>
          {filtered.length !== versions.length && (
            <button className="text-blue-600 hover:underline ml-1" onClick={() => setSearch('')}>
              清除
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="page-section mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索版本号、标题..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {VERSION_STATUS_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter(opt.value);
                setPage(1);
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">每页</span>
          <LegacySelect
            value={String(pageSize)}
            onValueChange={value => handlePageSizeChange(Number(value))}
            options={[
              { value: '10', label: '10' },
              { value: '20', label: '20' },
              { value: '50', label: '50' },
              { value: '100', label: '100' },
            ]}
            className="h-8 w-16"
          />
          <span className="text-sm text-muted-foreground">条</span>
        </div>

        {/* View mode toggle */}
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('card')}
            title="卡片视图"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'compact' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('compact')}
            title="紧凑视图"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 mb-6">
          <CardContent className="py-6 flex flex-col items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div className="text-center">
              <p className="font-medium text-red-700 dark:text-red-400">加载失败</p>
              <p className="text-sm text-red-600 dark:text-red-500 mt-1">{error.message}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setIsLoading(true);
                getVersions(page, pageSize, statusFilter)
                  .then(setData)
                  .catch(err => setError(err instanceof Error ? err : new Error(String(err))))
                  .finally(() => setIsLoading(false));
              }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              重试
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-6 bg-muted rounded w-1/3" />
                  <div className="h-5 bg-muted rounded w-16" />
                </div>
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-full mb-1" />
                <div className="h-3 bg-muted rounded w-2/3 mb-3" />
                <div className="flex gap-2 mb-3">
                  <div className="h-5 bg-muted rounded w-16" />
                  <div className="h-5 bg-muted rounded w-16" />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                  <div className="h-3 bg-muted rounded w-20" />
                  <div className="h-3 bg-muted rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="暂无版本记录"
          description="创建第一个版本开始管理"
          action={
            <Link href="/versions/new">
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                创建版本
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          {viewMode === 'card' ? (
            /* Card grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {filtered.map(v => (
                <div
                  key={v.id}
                  className={`relative ${compareMode ? 'ring-2 ring-blue-300 rounded-xl' : ''} ${selectedVersions.includes(v.id) ? 'ring-blue-500' : ''}`}
                >
                  {/* Compare mode checkbox */}
                  {compareMode && (
                    <button
                      className={`absolute top-3 right-3 z-10 w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedVersions.includes(v.id) ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-gray-300 hover:border-blue-400'}`}
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedVersions(prev =>
                          prev.includes(v.id)
                            ? prev.filter(id => id !== v.id)
                            : prev.length < 2
                              ? [...prev, v.id]
                              : prev
                        );
                      }}
                    >
                      {selectedVersions.includes(v.id) && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  )}
                  <Link href={`/versions/${v.id}`} className="block">
                    <div className="page-section hover:shadow-md transition-shadow cursor-pointer h-full">
                      <div className="p-5">
                        {/* Top row: version + status */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xl font-bold font-mono text-foreground">
                              {v.version}
                            </span>
                            {v.isMain && (
                              <Badge variant="success" className="text-xs gap-1">
                                <Star className="w-3 h-3" />
                                主版本
                              </Badge>
                            )}
                            <Badge variant={VERSION_STATUS_BADGE[v.status]} className="text-xs">
                              {VERSION_STATUS_LABELS[v.status]}
                            </Badge>
                          </div>
                          <Badge
                            variant={BUILD_STATUS_BADGE_VARIANT[v.buildStatus]}
                            className={`text-xs ${v.buildStatus === 'pending' ? 'bg-muted text-muted-foreground border-border' : ''}`}
                          >
                            {BUILD_STATUS_LABELS[v.buildStatus]}
                          </Badge>
                        </div>

                        {/* Title & description */}
                        <div className="mb-3">
                          <div className="font-medium text-foreground mb-1">{v.title}</div>
                          {v.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {v.description}
                            </p>
                          )}
                        </div>

                        {/* Tags row */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {v.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Git tag */}
                        {v.gitTag && (
                          <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 mb-3">
                            <Tag className="w-3.5 h-3.5" />
                            <span className="font-mono">{v.gitTag}</span>
                          </div>
                        )}

                        {/* Version summary preview */}
                        {v.summary && (
                          <div className="mt-2 p-2 bg-muted/50 rounded-md">
                            <div className="text-xs text-muted-foreground mb-1">
                              摘要 ·{' '}
                              {v.summaryGeneratedAt
                                ? new Date(v.summaryGeneratedAt).toLocaleDateString('zh-CN')
                                : '自动生成'}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {v.summary}
                            </p>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border flex-wrap gap-1">
                          <span>{v.commitCount} 次提交</span>
                          <span>{v.changedFiles.length} 个文件</span>
                          <span>
                            {v.createdAt ? new Date(v.createdAt).toLocaleDateString('zh-CN') : '-'}
                          </span>
                          {v.releasedAt && (
                            <span className="text-green-600 dark:text-green-400">
                              发布于 {new Date(v.releasedAt).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            /* Compact table view */
            <div className="page-table-wrapper mb-6">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="page-table-header">
                    <th className="page-table-header-cell">版本</th>
                    <th className="page-table-header-cell">状态</th>
                    <th className="page-table-header-cell">标题</th>
                    <th className="page-table-header-cell">构建状态</th>
                    <th className="page-table-header-cell">提交</th>
                    <th className="page-table-header-cell">文件</th>
                    <th className="page-table-header-cell">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(v => (
                    <tr key={v.id} className="page-table-row">
                      <td className="page-table-cell">
                        <Link
                          href={`/versions/${v.id}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <span className="font-mono font-bold">{v.version}</span>
                          {v.isMain && (
                            <Badge variant="success" className="text-xs gap-1">
                              <Star className="w-3 h-3" />
                            </Badge>
                          )}
                        </Link>
                      </td>
                      <td className="page-table-cell">
                        <Badge variant={VERSION_STATUS_BADGE[v.status]} className="text-xs">
                          {VERSION_STATUS_LABELS[v.status]}
                        </Badge>
                      </td>
                      <td className="page-table-cell">
                        <span className="font-medium">{v.title}</span>
                      </td>
                      <td className="page-table-cell">
                        <Badge
                          variant={BUILD_STATUS_BADGE_VARIANT[v.buildStatus]}
                          className={`text-xs ${v.buildStatus === 'pending' ? 'bg-muted text-muted-foreground border-border' : ''}`}
                        >
                          {BUILD_STATUS_LABELS[v.buildStatus]}
                        </Badge>
                      </td>
                      <td className="page-table-cell">{v.commitCount}</td>
                      <td className="page-table-cell">{v.changedFiles.length}</td>
                      <td className="page-table-cell">
                        {v.createdAt ? new Date(v.createdAt).toLocaleDateString('zh-CN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-card border-border px-4 py-3">
              <span className="text-sm text-muted-foreground">
                共 {total} 条，第 {page}/{totalPages} 页
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Version Compare Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5" />
              版本对比
            </DialogTitle>
          </DialogHeader>
          {compareLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">加载中...</span>
            </div>
          ) : compareError ? (
            <div className="text-center py-8 text-red-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>{compareError}</p>
            </div>
          ) : compareResult ? (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex items-center gap-4 text-sm">
                <Badge variant={compareResult.summary.newerIsAhead ? 'success' : 'outline'}>
                  {compareResult.summary.commitDelta > 0 ? '+' : ''}
                  {compareResult.summary.commitDelta} commits
                </Badge>
                <Badge variant="outline">
                  +{compareResult.files.added.length} -{compareResult.files.removed.length} files
                </Badge>
                {compareResult.summary.hasBreakingChanges && (
                  <Badge variant="error">Breaking Changes</Badge>
                )}
              </div>
              {/* Recommendation */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                💡 {compareResult.summary.recommendation}
              </div>
              {/* New commits in to */}
              {compareResult.commits.onlyTo.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-green-600">
                    + 新提交 ({compareResult.commits.onlyTo.length})
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {compareResult.commits.onlyTo.map(c => (
                      <div key={c.hash} className="text-xs font-mono text-muted-foreground">
                        <span className="text-green-500">{c.hash.slice(0, 7)}</span> {c.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Removed commits from from */}
              {compareResult.commits.onlyFrom.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-red-600">
                    - 移除的提交 ({compareResult.commits.onlyFrom.length})
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {compareResult.commits.onlyFrom.map(c => (
                      <div key={c.hash} className="text-xs font-mono text-muted-foreground">
                        <span className="text-red-500">{c.hash.slice(0, 7)}</span> {c.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* File changes */}
              <div className="grid grid-cols-3 gap-4">
                {compareResult.files.added.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1 text-green-600">
                      + 新文件 ({compareResult.files.added.length})
                    </h4>
                    <div className="space-y-0.5 max-h-32 overflow-y-auto">
                      {compareResult.files.added.slice(0, 10).map(f => (
                        <div key={f} className="text-xs font-mono text-muted-foreground truncate">
                          {f}
                        </div>
                      ))}
                      {compareResult.files.added.length > 10 && (
                        <div className="text-xs text-muted-foreground">
                          +{compareResult.files.added.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {compareResult.files.removed.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1 text-red-600">
                      - 删除文件 ({compareResult.files.removed.length})
                    </h4>
                    <div className="space-y-0.5 max-h-32 overflow-y-auto">
                      {compareResult.files.removed.slice(0, 10).map(f => (
                        <div key={f} className="text-xs font-mono text-muted-foreground truncate">
                          {f}
                        </div>
                      ))}
                      {compareResult.files.removed.length > 10 && (
                        <div className="text-xs text-muted-foreground">
                          +{compareResult.files.removed.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {compareResult.files.modified.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1 text-yellow-600">
                      ~ 修改文件 ({compareResult.files.modified.length})
                    </h4>
                    <div className="space-y-0.5 max-h-32 overflow-y-auto">
                      {compareResult.files.modified.slice(0, 10).map(f => (
                        <div key={f} className="text-xs font-mono text-muted-foreground truncate">
                          {f}
                        </div>
                      ))}
                      {compareResult.files.modified.length > 10 && (
                        <div className="text-xs text-muted-foreground">
                          +{compareResult.files.modified.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      </TabsContent>
      <TabsContent value="panel" className="mt-6">
        <VersionPanelContent />
      </TabsContent>
      <TabsContent value="branches" className="mt-6">
        <BranchesContent />
      </TabsContent>
    </div>
  );
}

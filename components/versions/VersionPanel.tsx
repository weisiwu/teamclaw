"use client";

import { useState, useMemo } from "react";
import { Version, VERSION_STATUS_BADGE_VARIANT, VERSION_STATUS_LABELS, VERSION_TAG_OPTIONS, VersionStatus } from "@/lib/api/types";
import {
  Tag, Star, GitBranchIcon, FileText, Calendar, Search, X,
  ChevronDown, ChevronRight, FolderOpen, BarChart3, Grid3X3, List, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
} from "@/components/ui/dialog";

interface VersionPanelProps {
  versions: Version[];
  isOpen: boolean;
  onClose: () => void;
  onSelectVersion: (version: Version) => void;
  onRebuild?: (version: Version) => void;
}

// 版本卡片组件 - 展示单个版本的详细信息
function VersionCard({ 
  version, 
  onClick,
  expanded,
  onToggleExpand,
}: { 
  version: Version; 
  onClick: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`
        border rounded-xl p-4 cursor-pointer transition-all duration-200
        ${isHovered ? 'border-blue-300 shadow-md bg-blue-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}
        ${version.isMain ? 'ring-2 ring-blue-200' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* 头部：Tag 名称 + 状态徽章 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-blue-600 mt-0.5" />
          <span className="font-mono font-semibold text-gray-900 text-lg">
            {version.gitTag || version.version}
          </span>
          {version.isMain && (
            <Badge variant="success" className="text-xs gap-1">
              <Star className="w-3 h-3" fill="currentColor" /> 主版本
            </Badge>
          )}
        </div>
        <Badge variant={VERSION_STATUS_BADGE_VARIANT[version.status]}>
          {VERSION_STATUS_LABELS[version.status]}
        </Badge>
      </div>

      {/* 版本和标题 */}
      <div className="mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
          <span className="font-medium text-gray-900">{version.version}</span>
          <span className="text-gray-300">•</span>
          <span className="truncate">{version.title}</span>
        </div>
        {version.description && (
          <p className="text-sm text-gray-500 line-clamp-2">{version.description}</p>
        )}
      </div>

      {/* 标签 */}
      {version.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {version.tags.slice(0, 3).map((tag) => {
            const tagOption = VERSION_TAG_OPTIONS.find((t) => t.value === tag);
            return (
              <span
                key={tag}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${tagOption?.color || 'bg-gray-100 text-gray-800'}`}
              >
                {tagOption?.label || tag}
              </span>
            );
          })}
          {version.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-gray-400">
              +{version.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 统计信息行 */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <GitBranchIcon className="w-3 h-3" />
          {version.commitCount} 提交
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {version.changedFiles.length} 文件
        </span>
        {version.gitTagCreatedAt && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(version.gitTagCreatedAt).toLocaleDateString("zh-CN")}
          </span>
        )}
      </div>

      {/* 展开查看更多信息 */}
      <div 
        className="border-t pt-3 mt-2"
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
      >
        <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {expanded ? '收起详情' : '查看详情'}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            {/* 变更文件列表 */}
            {version.changedFiles.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />
                  变更文件 ({version.changedFiles.length})
                </div>
                <div className="bg-gray-50 rounded-lg p-2 max-h-32 overflow-y-auto">
                  <div className="space-y-1">
                    {version.changedFiles.slice(0, 15).map((file, index) => (
                      <div 
                        key={index} 
                        className="text-xs font-mono text-gray-600 truncate px-1"
                        title={file}
                      >
                        {file}
                      </div>
                    ))}
                    {version.changedFiles.length > 15 && (
                      <div className="text-xs text-gray-400 text-center pt-1">
                        +{version.changedFiles.length - 15} 个文件...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 构建信息 */}
            {version.artifactUrl && (
              <div className="flex items-center gap-2">
                <Badge 
                  variant={version.buildStatus === 'success' ? 'success' : version.buildStatus === 'failed' ? 'error' : 'info'}
                  className="text-xs"
                >
                  构建 {version.buildStatus}
                </Badge>
                <span className="text-xs text-gray-500">产物可用</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 简化版本行组件 - 用于列表视图
function VersionRow({ 
  version, 
  onClick,
  onRebuild,
}: { 
  version: Version; 
  onClick: () => void;
  onRebuild?: (version: Version) => void;
}) {
  return (
    <div 
      className="flex items-center gap-4 px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <Tag className="w-4 h-4 text-blue-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium text-gray-900">
            {version.gitTag || version.version}
          </span>
          {version.isMain && (
            <Star className="w-3 h-3 text-amber-500" fill="currentColor" />
          )}
          <Badge variant={VERSION_STATUS_BADGE_VARIANT[version.status]} className="text-xs">
            {VERSION_STATUS_LABELS[version.status]}
          </Badge>
        </div>
        <div className="text-sm text-gray-500 truncate mt-0.5">
          {version.title} • {version.commitCount} 提交
        </div>
      </div>
      <div className="text-sm text-gray-500 flex-shrink-0">
        {version.gitTagCreatedAt && (
          new Date(version.gitTagCreatedAt).toLocaleDateString("zh-CN")
        )}
      </div>
      <div className="text-sm text-gray-400 flex-shrink-0">
        {version.changedFiles.length} 文件
      </div>
      {onRebuild && (
        <button
          onClick={(e) => { e.stopPropagation(); onRebuild(version); }}
          className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
          title="重新打包"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function VersionPanel({ versions, isOpen, onClose, onSelectVersion, onRebuild }: VersionPanelProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | VersionStatus>("all");
  const [showStats, setShowStats] = useState(false);

  // 过滤并排序版本
  const filteredVersions = useMemo(() => {
    return versions
      .filter((v) => {
        // 搜索过滤
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          if (
            !v.version.toLowerCase().includes(query) &&
            !v.gitTag?.toLowerCase().includes(query) &&
            !v.title.toLowerCase().includes(query) &&
            !v.description?.toLowerCase().includes(query)
          ) {
            return false;
          }
        }
        // 状态过滤
        if (statusFilter !== "all" && v.status !== statusFilter) {
          return false;
        }
        // 日期过滤
        if (dateRange.start || dateRange.end) {
          const tagDate = v.gitTagCreatedAt ? new Date(v.gitTagCreatedAt).getTime() : 0;
          if (dateRange.start) {
            const startDate = new Date(dateRange.start).getTime();
            if (tagDate < startDate) return false;
          }
          if (dateRange.end) {
            const endDate = new Date(dateRange.end).getTime();
            if (tagDate > endDate + 86400000) return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        // 优先按 Git Tag 创建时间排序（最新在前）
        const dateA = a.gitTagCreatedAt ? new Date(a.gitTagCreatedAt).getTime() : 0;
        const dateB = b.gitTagCreatedAt ? new Date(b.gitTagCreatedAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [versions, searchQuery, dateRange, statusFilter]);

  // 统计数据
  const stats = useMemo(() => {
    const now = new Date();
    const monthly: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    
    // 初始化近6个月
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthly[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0;
    }
    
    filteredVersions.forEach((v) => {
      // 月度统计
      if (v.gitTagCreatedAt) {
        const key = v.gitTagCreatedAt.slice(0, 7);
        if (monthly[key] !== undefined) monthly[key]++;
      }
      // 状态统计
      statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
    });
    
    return { monthly, statusCounts, total: filteredVersions.length };
  }, [filteredVersions]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateRange({ start: "", end: "" });
    setStatusFilter("all");
  };

  const hasActiveFilters = searchQuery || dateRange.start || dateRange.end || statusFilter !== "all";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0" title="版本面板">
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">版本面板</h2>
              <Badge variant="default">
                {stats.total} 个版本
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* 视图切换 */}
              <div className="flex border rounded-md overflow-hidden">
                <button
                  className={`p-2 ${viewMode === "grid" ? "bg-blue-50 text-blue-600" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                  onClick={() => setViewMode("grid")}
                  title="网格视图"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  className={`p-2 ${viewMode === "list" ? "bg-blue-50 text-blue-600" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                  onClick={() => setViewMode("list")}
                  title="列表视图"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowStats(!showStats)}>
                <BarChart3 className="w-4 h-4 mr-1" />
                统计
              </Button>
            </div>
          </div>

          {/* 搜索和筛选 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索版本号、Tag、标题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | VersionStatus)}
              className="px-3 py-2 border rounded-md text-sm bg-white"
            >
              <option value="all">全部状态</option>
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="archived">已归档</option>
            </select>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-36"
              placeholder="开始"
            />
            <span className="text-gray-400">-</span>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-36"
              placeholder="结束"
            />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                清除
              </Button>
            )}
          </div>

          {/* 统计面板 */}
          {showStats && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              {/* 月度发布趋势 */}
              <div className="col-span-2 bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium mb-3">近6个月发布趋势</div>
                <div className="flex items-end justify-between gap-2 h-20">
                  {Object.entries(stats.monthly).map(([month, count]) => (
                    <div key={month} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t transition-all min-h-[2px]"
                        style={{ 
                          height: `${Math.max((count / Math.max(...Object.values(stats.monthly), 1)) * 80, count > 0 ? 4 : 0)}px` 
                        }}
                        title={`${month}: ${count} 个版本`}
                      />
                      <div className="text-xs text-gray-500 mt-1">{month.slice(5)}月</div>
                      <div className="text-xs font-medium">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* 状态分布 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium mb-3">状态分布</div>
                <div className="space-y-2">
                  {(["published", "draft", "archived"] as const).map((status) => {
                    const count = stats.statusCounts[status] || 0;
                    const total = filteredVersions.length;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            status === 'published' ? 'bg-green-500' : 
                            status === 'draft' ? 'bg-yellow-500' : 'bg-gray-400'
                          }`} />
                          <span className="text-sm text-gray-600">
                            {status === 'published' ? '已发布' : status === 'draft' ? '草稿' : '已归档'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{count}</span>
                          <span className="text-xs text-gray-400">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredVersions.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">暂无版本</p>
              <p className="text-sm mt-1">创建版本后即可在面板中查看</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVersions.map((version) => (
                <VersionCard
                  key={version.id}
                  version={version}
                  onClick={() => onSelectVersion(version)}
                  expanded={expandedCards.has(version.id)}
                  onToggleExpand={() => toggleExpand(version.id)}
                />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {/* 表头 */}
              <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-b text-sm font-medium text-gray-500">
                <Tag className="w-4 h-4" />
                <div className="flex-1">版本信息</div>
                <div className="w-24 text-right">创建日期</div>
                <div className="w-20 text-right">文件数</div>
              </div>
              {/* 数据行 */}
              {filteredVersions.map((version) => (
                <VersionRow
                  key={version.id}
                  version={version}
                  onClick={() => onSelectVersion(version)}
                  onRebuild={onRebuild}
                />
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-6 py-3 border-t bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              显示 {filteredVersions.length} / {versions.length} 个版本
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Grid3X3 className="w-3 h-3" /> 网格视图
              </span>
              <span className="flex items-center gap-1">
                <List className="w-3 h-3" /> 列表视图
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

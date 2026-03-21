/**
 * ChangeTimeline Component
 * 变更历史时间线 - 展示完整的变更追踪时间线
 */
"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VersionChangelog, ChangelogChange, VersionMessageScreenshot } from "@/lib/api/types";
import { 
  Clock, 
  GitCommit, 
  Image as ImageIcon, 
  FileText, 
  Sparkles,
  ChevronDown,
  ChevronRight,
  Bug,
  Wrench,
  AlertTriangle,
  BookOpen,
  RefreshCw,
  Plus
} from "lucide-react";

interface ChangeTimelineProps {
  changelog: VersionChangelog | null;
  screenshots: VersionMessageScreenshot[];
  versionCreatedAt?: string;
  onGenerateChangelog?: () => void;
  generating?: boolean;
  onLinkScreenshot?: () => void;
}

const changeTypeConfig: Record<ChangelogChange["type"], { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: React.ReactNode;
}> = {
  feature: { 
    label: "新功能", 
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200",
    icon: <Plus className="w-3 h-3" />
  },
  fix: { 
    label: "Bug修复", 
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
    icon: <Bug className="w-3 h-3" />
  },
  improvement: { 
    label: "改进", 
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    icon: <Wrench className="w-3 h-3" />
  },
  breaking: { 
    label: "破坏性变更", 
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    icon: <AlertTriangle className="w-3 h-3" />
  },
  docs: { 
    label: "文档更新", 
    color: "text-gray-600",
    bgColor: "bg-gray-50 border-gray-200",
    icon: <BookOpen className="w-3 h-3" />
  },
  refactor: { 
    label: "代码重构", 
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
    icon: <RefreshCw className="w-3 h-3" />
  },
  other: { 
    label: "其他", 
    color: "text-gray-500",
    bgColor: "bg-gray-50 border-gray-200",
    icon: <FileText className="w-3 h-3" />
  },
};

// 变更统计
function ChangeStatistics({ changelog }: { changelog: VersionChangelog | null }) {
  if (!changelog) return null;
  
  const stats = {
    feature: 0,
    fix: 0,
    improvement: 0,
    breaking: 0,
    docs: 0,
    refactor: 0,
    other: 0,
  };
  
  changelog.changes.forEach(change => {
    if (stats[change.type] !== undefined) {
      stats[change.type]++;
    }
  });
  
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  
  return (
    <div className="grid grid-cols-4 gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
      {Object.entries(stats).map(([type, count]) => {
        if (count === 0) return null;
        const config = changeTypeConfig[type as ChangelogChange["type"]];
        return (
          <div key={type} className={`text-center p-2 rounded ${config.bgColor}`}>
            <div className={`text-lg font-bold ${config.color}`}>{count}</div>
            <div className="text-xs text-gray-500">{config.label}</div>
          </div>
        );
      })}
      <div className="text-center p-2 rounded bg-gray-100">
        <div className="text-lg font-bold text-gray-700">{total}</div>
        <div className="text-xs text-gray-500">总计</div>
      </div>
    </div>
  );
}

// 单个变更项
function ChangeItem({ change, index }: { change: ChangelogChange; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const config = changeTypeConfig[change.type];
  
  return (
    <div className="relative pl-8 pb-4">
      {/* 时间线连接线 */}
      {index < 100 && (
        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200" />
      )}
      
      {/* 节点 */}
      <div className={`absolute left-0 top-0 w-6 h-6 rounded-full ${config.bgColor} border-2 border-white flex items-center justify-center ${config.color}`}>
        {config.icon}
      </div>
      
      {/* 内容 */}
      <div className={`rounded-lg border p-3 ${config.bgColor}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge className={`${config.color} border-current text-xs`}>
              {config.label}
            </Badge>
            {change.files && change.files.length > 0 && (
              <span className="text-xs text-gray-500">
                {change.files.length} 个文件
              </span>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
        
        <p className="text-sm text-gray-700">{change.description}</p>
        
        {expanded && change.files && change.files.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">变更文件:</p>
            <div className="space-y-1">
              {change.files.map((file, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-mono text-gray-600">
                  <GitCommit className="w-3 h-3" />
                  {file}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 截图时间线
function ScreenshotTimeline({ 
  screenshots, 
  onLink 
}: { 
  screenshots: VersionMessageScreenshot[];
  onLink?: () => void;
}) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (id: string) => {
    setImageErrors(prev => new Set(prev).add(id));
  };

  if (screenshots.length === 0) {
    return (
      <div className="border-2 border-dashed rounded-lg p-4 text-center">
        <ImageIcon className="mx-auto h-6 w-6 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">暂无截图</p>
        {onLink && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onLink}>
            <Plus className="w-4 h-4 mr-1" />
            添加截图
          </Button>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {screenshots.map((screenshot, index) => {
        const hasError = imageErrors.has(screenshot.id);
        return (
          <div key={screenshot.id} className="relative pl-8 pb-4">
            {index < screenshots.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200" />
            )}
            <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center">
              <ImageIcon className="w-3 h-3 text-purple-600" />
            </div>
            <div className="rounded-lg border p-2 bg-white">
              {hasError ? (
                <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
              ) : (
                <Image 
                  src={screenshot.thumbnailUrl || screenshot.screenshotUrl} 
                  alt="Screenshot" 
                  width={200}
                  height={96}
                  className="w-full h-24 object-cover rounded"
                  onError={() => handleImageError(screenshot.id)}
                />
              )}
              <div className="flex items-center justify-between mt-2">
                {screenshot.messageContent && (
                  <p className="text-xs text-gray-500 line-clamp-2 flex-1">
                    {screenshot.messageContent}
                  </p>
                )}
                {screenshot.branchName && (
                  <Badge variant="default" className="ml-2 text-xs whitespace-nowrap bg-white/80 text-gray-600 border-gray-200">
                    {screenshot.branchName}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">{screenshot.senderName}</span>
                <span className="text-xs text-gray-400">
                  {new Date(screenshot.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChangeTimeline({
  changelog,
  screenshots,
  onGenerateChangelog,
  generating,
  onLinkScreenshot,
}: ChangeTimelineProps) {
  const [viewMode, setViewMode] = useState<"timeline" | "stats" | "screenshots">("timeline");
  
  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium">变更时间线</span>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={viewMode === "timeline" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setViewMode("timeline")}
          >
            <GitCommit className="w-3 h-3 mr-1" />
            详情
          </Button>
          <Button
            variant={viewMode === "stats" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setViewMode("stats")}
          >
            <FileText className="w-3 h-3 mr-1" />
            统计
          </Button>
          <Button
            variant={viewMode === "screenshots" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setViewMode("screenshots")}
          >
            <ImageIcon className="w-3 h-3 mr-1" />
            截图 ({screenshots.length})
          </Button>
        </div>
      </div>
      
      {/* 统计视图 */}
      {viewMode === "stats" && (
        <ChangeStatistics changelog={changelog} />
      )}
      
      {/* 截图视图 */}
      {viewMode === "screenshots" && (
        <ScreenshotTimeline screenshots={screenshots} onLink={onLinkScreenshot} />
      )}
      
      {/* 时间线视图 */}
      {viewMode === "timeline" && (
        <>
          {onGenerateChangelog && !changelog && (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
              <p className="text-sm text-gray-600 mb-3">点击下方按钮生成变更摘要</p>
              <Button onClick={onGenerateChangelog} disabled={generating}>
                {generating ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {generating ? "生成中..." : "生成变更摘要"}
              </Button>
            </div>
          )}
          
          {changelog && (
            <div className="space-y-1">
              {changelog.changes.map((change, index) => (
                <ChangeItem key={index} change={change} index={index} />
              ))}
            </div>
          )}
          
          {!changelog && !onGenerateChangelog && (
            <p className="text-sm text-gray-500 text-center py-4">暂无变更记录</p>
          )}
        </>
      )}
    </div>
  );
}

export default ChangeTimeline;

/**
 * SimilarVersionsPanel Component
 * 相似版本展示面板
 */
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GitBranch, 
  Sparkles, 
  Loader2, 
  ExternalLink, 
  RefreshCw,
  ArrowRight
} from "lucide-react";

interface SimilarVersion {
  versionId: string;
  version: string;
  title: string;
  similarity: number;
  commonTags: string[];
}

interface SimilarVersionsPanelProps {
  versionId: string;
  onSelectVersion?: (versionId: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function SimilarVersionsPanel({
  versionId,
  onSelectVersion,
  onRefresh,
  isLoading = false,
}: SimilarVersionsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  
  // 获取相似版本数据（从缓存或重新计算）
  const [similarVersions, setSimilarVersions] = useState<SimilarVersion[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // 模拟从 localStorage 加载数据
  const loadSimilarVersions = async () => {
    if (!versionId) return;
    
    setHasLoaded(true);
    setLoadError(false);
    try {
      // 动态导入以避免 SSR 问题
      const { findSimilarVersions } = await import('@/lib/api/versions');
      const results = findSimilarVersions(versionId, 5);
      setSimilarVersions(results);
    } catch (err) {
      console.error('[SimilarVersionsPanel] Failed to load:', err);
      setLoadError(true);
    }
  };

  // 首次展开时加载数据
  const handleToggle = () => {
    if (!expanded && !hasLoaded) {
      loadSimilarVersions();
    }
    setExpanded(!expanded);
  };

  const similarityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.5) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            相似版本
          </CardTitle>
          <div className="flex gap-2">
            {onRefresh && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  onRefresh();
                  loadSimilarVersions();
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleToggle}
            >
              {expanded ? '收起' : '展开'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              <span className="ml-2 text-sm text-gray-500">正在分析...</span>
            </div>
          ) : loadError ? (
            <div className="text-center py-6">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-red-300" />
              <p className="text-sm text-red-500">加载相似版本失败</p>
              <p className="text-xs text-gray-400 mt-1">请稍后重试</p>
              <button
                className="mt-2 text-xs text-purple-600 hover:text-purple-700 underline"
                onClick={loadSimilarVersions}
              >
                重新加载
              </button>
            </div>
          ) : similarVersions.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <GitBranch className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">暂无相似版本</p>
              <p className="text-xs text-gray-400 mt-1">
                基于版本描述、标签和变更文件计算相似度
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {similarVersions.map((similar) => (
                <div 
                  key={similar.versionId}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  {/* 相似度进度条 */}
                  <div className="flex flex-col items-center gap-1 w-14 shrink-0">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          similar.similarity >= 0.8
                            ? 'bg-green-500'
                            : similar.similarity >= 0.5
                            ? 'bg-blue-500'
                            : 'bg-gray-400'
                        }`}
                        style={{ width: `${(similar.similarity * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${similarityColor(similar.similarity)}`}>
                      {(similar.similarity * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  {/* 版本信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{similar.version}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-700 truncate">{similar.title}</span>
                    </div>
                    
                    {/* 共同标签 */}
                    {similar.commonTags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {similar.commonTags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="default" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {similar.commonTags.length > 3 && (
                          <span className="text-xs text-gray-400">+{similar.commonTags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* 操作按钮 */}
                  {onSelectVersion && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onSelectVersion(similar.versionId)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {/* 说明 */}
              <p className="text-xs text-gray-400 text-center pt-2">
                基于版本摘要文本、标签和变更文件的相似度计算
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default SimilarVersionsPanel;

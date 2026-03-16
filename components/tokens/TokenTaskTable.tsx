"use client";

import { TaskTokenUsage, ModelType } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, Users, CheckCircle, Clock, XCircle, Clock4, Bot, DollarSign } from "lucide-react";
import { useState, useCallback } from "react";

interface TokenTaskTableProps {
  data?: TaskTokenUsage[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  isLoading?: boolean;
  onSearchChange?: (value: string) => void;
  onPageChange?: (page: number) => void;
}

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  return num.toLocaleString();
}

// 格式化金额
function formatCost(num?: number): string {
  if (num === undefined || num === null) return "$0.00";
  if (num >= 1) {
    return "$" + num.toFixed(2);
  }
  return "$" + num.toFixed(4);
}

// 模型标签映射
const MODEL_LABELS: Record<ModelType, string> = {
  "gpt-4": "GPT-4",
  "gpt-4o": "GPT-4o",
  "claude-3": "Claude-3",
  "claude-3.5": "Claude-3.5",
  "gemini": "Gemini",
  "default": "默认",
};

// 模型颜色映射
const MODEL_COLORS: Record<ModelType, string> = {
  "gpt-4": "bg-purple-100 text-purple-700",
  "gpt-4o": "bg-blue-100 text-blue-700",
  "claude-3": "bg-orange-100 text-orange-700",
  "claude-3.5": "bg-amber-100 text-amber-700",
  "gemini": "bg-cyan-100 text-cyan-700",
  "default": "bg-gray-100 text-gray-700",
};

export function TokenTaskTable({
  data,
  total = 0,
  page = 1,
  totalPages = 0,
  isLoading,
  onSearchChange,
  onPageChange,
}: TokenTaskTableProps) {
  const [search, setSearch] = useState("");

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      onSearchChange?.(value);
    },
    [onSearchChange]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      onPageChange?.(newPage);
    },
    [onPageChange]
  );

  // 获取状态显示信息
  const getStatusInfo = (status?: string, completedAt?: string | null) => {
    // 优先使用 status 字段，如果没有则根据 completedAt 判断
    const effectiveStatus = status || (completedAt ? "completed" : "in_progress");
    
    switch (effectiveStatus) {
      case "completed":
        return {
          icon: CheckCircle,
          label: "已完成",
          variant: "success" as const,
        };
      case "in_progress":
        return {
          icon: Clock4,
          label: "进行中",
          variant: "warning" as const,
        };
      case "pending":
        return {
          icon: Clock,
          label: "待处理",
          variant: "default" as const,
        };
      case "cancelled":
        return {
          icon: XCircle,
          label: "已取消",
          variant: "error" as const,
        };
      default:
        return {
          icon: Clock4,
          label: "进行中",
          variant: "warning" as const,
        };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>任务 Token 消耗</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>任务 Token 消耗</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">暂无数据</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>任务 Token 消耗</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索任务..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item) => {
            const statusInfo = getStatusInfo(item.status, item.completedAt);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div
                key={item.taskId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm text-gray-500">
                      {item.taskId}
                    </span>
                    {/* 状态标签 */}
                    <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </Badge>
                    {/* 模型标签 */}
                    {item.modelType && (
                      <Badge className={`flex items-center gap-1 ${MODEL_COLORS[item.modelType]}`}>
                        <Bot className="w-3 h-3" />
                        {MODEL_LABELS[item.modelType]}
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 truncate">
                    {item.taskTitle}
                  </h4>
                  {item.agents.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>{item.agents.join(", ")}</span>
                    </div>
                  )}
                </div>
                <div className="text-right ml-4 space-y-1">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatNumber(item.tokens)}
                  </p>
                  {/* 成本显示 */}
                  {item.cost !== undefined && (
                    <p className="text-sm text-emerald-600 flex items-center justify-end gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatCost(item.cost)}
                    </p>
                  )}
                  {item.completedAt && (
                    <p className="text-xs text-gray-500">{item.completedAt}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 px-2">
              第 {page} / {totalPages} 页 (共 {total} 条)
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

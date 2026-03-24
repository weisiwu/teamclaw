"use client";

import { LLMCallLog, TokenUsageFilters } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
} from "lucide-react";
import { useState } from "react";

interface LLMCallLogTableProps {
  data?: LLMCallLog[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onExport?: () => void;
  filters?: TokenUsageFilters;
  onFiltersChange?: (filters: TokenUsageFilters) => void;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
}

function formatCost(num: number): string {
  if (num >= 1) return "¥" + num.toFixed(2);
  return "¥" + num.toFixed(4);
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(2) + "s";
  return ms + "ms";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function StatusBadge({ status, errorMessage }: { status: string; errorMessage?: string }) {
  if (status === "success") {
    return (
      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
        <CheckCircle className="w-3 h-3 mr-1" />
        成功
      </Badge>
    );
  }
  if (status === "timeout") {
    return (
      <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
        <Clock className="w-3 h-3 mr-1" />
        超时
      </Badge>
    );
  }
  return (
    <div className="group relative">
      <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
        <XCircle className="w-3 h-3 mr-1" />
        错误
      </Badge>
      {errorMessage && (
        <div className="hidden group-hover:block absolute z-10 bottom-full left-0 mb-1 px-2 py-1 text-xs bg-gray-900 text-white rounded whitespace-nowrap">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

function exportToCSV(logs: LLMCallLog[]) {
  const headers = ["时间", "Agent", "Token(脱敏)", "模型", "输入Token", "输出Token", "总Token", "耗时", "状态", "成本"];
  const rows = logs.map((log) => [
    log.timestamp,
    log.agentName,
    log.tokenName,
    log.model,
    log.inputTokens,
    log.outputTokens,
    log.totalTokens,
    log.durationMs + "ms",
    log.status,
    log.cost.toFixed(4),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `llm-calls-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LLMCallLogTable({
  data,
  total,
  page = 1,

  totalPages = 1,
  isLoading,
  onPageChange,

  filters,
  onFiltersChange,
}: LLMCallLogTableProps) {
  const [searchValue, setSearchValue] = useState(filters?.agent || "");

  const handleSearch = () => {
    onFiltersChange?.({ ...filters, agent: searchValue, page: 1 });
  };

  const handleExport = () => {
    if (!data || data.length === 0) return;
    exportToCSV(data);
  };

  return (
    <Card>
      <CardContent className="p-4">
        {/* 筛选工具栏 */}
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索 Agent..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleSearch}>搜索</Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              共 {total?.toLocaleString() || 0} 条记录
            </span>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
              <Download className="w-4 h-4 mr-1" />
              导出CSV
            </Button>
          </div>
        </div>

        {/* 表格 */}
        {isLoading ? (
          <div className="animate-pulse space-y-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">时间</TableHead>
                  <TableHead className="w-20">Agent</TableHead>
                  <TableHead className="w-28">Token(脱敏)</TableHead>
                  <TableHead className="w-28">模型</TableHead>
                  <TableHead className="text-right">输入Token</TableHead>
                  <TableHead className="text-right">输出Token</TableHead>
                  <TableHead className="text-right">总Token</TableHead>
                  <TableHead className="text-right">耗时</TableHead>
                  <TableHead className="text-right">成本</TableHead>
                  <TableHead className="w-20">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data || data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-gray-400 py-8">
                      暂无调用记录
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((log) => (
                    <TableRow key={log.id} className="text-xs">
                      <TableCell className="text-gray-500 whitespace-nowrap">
                        {formatTime(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">{log.agentName}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">{log.tokenName}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(log.tokenId)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{log.model}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {formatNumber(log.inputTokens)}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {formatNumber(log.outputTokens)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(log.totalTokens)}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {formatDuration(log.durationMs)}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {formatCost(log.cost)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} errorMessage={log.errorMessage} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              第 {page} / {totalPages} 页，共 {total?.toLocaleString() || 0} 条
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) {
                    p = i + 1;
                  } else if (page <= 3) {
                    p = i + 1;
                  } else if (page >= totalPages - 2) {
                    p = totalPages - 4 + i;
                  } else {
                    p = page - 2 + i;
                  }
                  return (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => onPageChange?.(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(page + 1)}
                disabled={page >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

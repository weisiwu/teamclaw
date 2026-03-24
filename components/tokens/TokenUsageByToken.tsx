"use client";

import { ApiTokenUsageSummary } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, AlertTriangle, CheckCircle, XCircle, Coins, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface TokenUsageByTokenProps {
  data?: ApiTokenUsageSummary[];
  isLoading?: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
}

function formatCost(num: number): string {
  if (num >= 1) return "¥" + num.toFixed(2);
  return "¥" + num.toFixed(4);
}

function BudgetProgress({ usage, budget, tokenId }: { usage: number; budget: number; tokenId: string }) {
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const pct = budget > 0 ? Math.min((usage / budget) * 100, 100) : 0;
  const isOver = usage >= budget;
  const isWarning = pct >= 80 && !isOver;

  useEffect(() => {
    if (isOver) {
      setToastMsg(`⚠️ ${tokenId} 已超预算！`);
      setToastVisible(true);
    } else if (isWarning) {
      setToastMsg(`🔔 ${tokenId} 预算使用已达 80%`);
      setToastVisible(true);
    }
  }, [isOver, isWarning, tokenId]);

  useEffect(() => {
    if (toastVisible) {
      const t = setTimeout(() => setToastVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [toastVisible]);

  const textColorClass = isOver ? "text-red-600" : isWarning ? "text-yellow-600" : "text-gray-700";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className={textColorClass}>
          {formatNumber(usage)} / {formatNumber(budget)}
        </span>
        <span className={textColorClass}>{pct.toFixed(1)}%</span>
      </div>
      <div className="relative">
        <Progress value={pct} className="h-2" />
        {isOver && (
          <AlertTriangle className="absolute -top-4 -right-1 w-3 h-3 text-red-500" />
        )}
        {isWarning && (
          <span className="absolute -top-4 -right-1 text-yellow-500 text-xs">⚠️</span>
        )}
      </div>
      {toastVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm text-white bg-gray-900 animate-in fade-in slide-in-from-bottom-2">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

export function TokenUsageByToken({ data, isLoading }: TokenUsageByTokenProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-8 bg-gray-200 rounded w-48" />
                <div className="h-2 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          暂无 Token 用量数据
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((token) => {
        const budgetPct = token.monthlyBudget > 0
          ? (token.currentMonthUsage / token.monthlyBudget) * 100
          : 0;
        const isOver = token.currentMonthUsage >= token.monthlyBudget;
        const isWarning = budgetPct >= 80 && !isOver;
        const successRate = token.callCount > 0
          ? ((token.successCount / token.callCount) * 100).toFixed(1)
          : "0.0";

        return (
          <Card key={token.tokenId}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{token.tokenName}</h3>
                    {isOver && (
                      <Badge variant="destructive" className="text-xs">
                        <XCircle className="w-3 h-3 mr-1" />
                        超预算
                      </Badge>
                    )}
                    {isWarning && (
                      <Badge variant="default" className="bg-yellow-500 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        80%预警
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{token.tokenPrefix}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span className="font-mono">{token.tokenId}</span>
                </div>
              </div>

              {/* 预算进度条 */}
              <div className="mb-4">
                <BudgetProgress
                  usage={token.currentMonthUsage}
                  budget={token.monthlyBudget}
                  tokenId={token.tokenName}
                />
              </div>

              {/* 统计卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-blue-50">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">当月用量</p>
                    <p className="text-sm font-semibold">{formatNumber(token.currentMonthUsage)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-purple-50">
                    <Coins className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">累计用量</p>
                    <p className="text-sm font-semibold">{formatNumber(token.totalUsage)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-green-50">
                    <Bot className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">调用次数</p>
                    <p className="text-sm font-semibold">{token.callCount.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-emerald-50">
                    {isOver ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">成功率</p>
                    <p className="text-sm font-semibold">{successRate}%</p>
                  </div>
                </div>
              </div>

              {/* 详细数据 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400">输入Token</p>
                  <p className="text-xs font-medium">{formatNumber(token.inputTokens)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">输出Token</p>
                  <p className="text-xs font-medium">{formatNumber(token.outputTokens)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">当月成本</p>
                  <p className="text-xs font-medium">{formatCost(token.cost)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">平均响应</p>
                  <p className="text-xs font-medium">{(token.avgResponseTime / 1000).toFixed(2)}s</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">失败次数</p>
                  <p className="text-xs font-medium text-red-500">{token.failCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

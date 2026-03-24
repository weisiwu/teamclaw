"use client";

import { AgentTokenUsage } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Coins, Clock, Hash, TrendingUp } from "lucide-react";
import { useState } from "react";

interface TokenUsageByAgentProps {
  data?: AgentTokenUsage[];
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

// Agent 图标颜色映射
const AGENT_COLORS: Record<string, { bg: string; text: string }> = {
  coder: { bg: "bg-blue-50", text: "text-blue-600" },
  pm: { bg: "bg-purple-50", text: "text-purple-600" },
  architect: { bg: "bg-orange-50", text: "text-orange-600" },
  tester: { bg: "bg-red-50", text: "text-red-600" },
  default: { bg: "bg-gray-50", text: "text-gray-600" },
};

function getAgentColor(name: string) {
  return AGENT_COLORS[name.toLowerCase()] || AGENT_COLORS.default;
}

export function TokenUsageByAgent({ data, isLoading }: TokenUsageByAgentProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-5 bg-gray-200 rounded w-24" />
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-10 bg-gray-200 rounded" />
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
          暂无 Agent 用量数据
        </CardContent>
      </Card>
    );
  }

  const selected = selectedAgent ? data.find((a) => a.agentName === selectedAgent) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Agent 列表 */}
      <div className="space-y-4">
        {data.map((agent) => {
          const color = getAgentColor(agent.agentName);
          const isSelected = selectedAgent === agent.agentName;
          return (
            <Card
              key={agent.agentName}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => setSelectedAgent(isSelected ? null : agent.agentName)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${color.bg}`}>
                    <Bot className={`w-5 h-5 ${color.text}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 capitalize">{agent.agentName}</h3>
                    <p className="text-xs text-gray-400">
                      最后调用: {new Date(agent.lastCalledAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">调用次数</p>
                    <p className="text-sm font-bold">{agent.callCount.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Token消耗</p>
                    <p className="text-sm font-bold">{formatNumber(agent.totalTokens)}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">成本</p>
                    <p className="text-sm font-bold">{formatCost(agent.totalCost)}</p>
                  </div>
                </div>

                {/* Token 分布条 */}
                {Object.keys(agent.tokenDistribution).length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Token 分布</p>
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                      {Object.entries(agent.tokenDistribution).map(([model, tokens]) => {
                        const pct = (tokens / agent.totalTokens) * 100;
                        const modelColor = model.includes("claude") ? "bg-purple-400" : "bg-blue-400";
                        return (
                          <div
                            key={model}
                            className={`${modelColor} first:rounded-l-full last:rounded-r-full`}
                            style={{ width: `${pct}%` }}
                            title={`${model}: ${formatNumber(tokens)} (${pct.toFixed(1)}%)`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {Object.entries(agent.tokenDistribution).map(([model, tokens]) => {
                        const pct = ((tokens / agent.totalTokens) * 100).toFixed(1);
                        const modelColor = model.includes("claude") ? "text-purple-600" : "text-blue-600";
                        return (
                          <span key={model} className={`text-xs ${modelColor}`}>
                            {model}: {pct}%
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Agent 详情 */}
      {selected && (
        <Card className="h-fit">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              {selected.agentName} 详情
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  <Hash className="w-3 h-3 text-blue-600" />
                  <span className="text-xs text-blue-600">调用次数</span>
                </div>
                <p className="text-lg font-bold text-blue-700">{selected.callCount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  <Coins className="w-3 h-3 text-purple-600" />
                  <span className="text-xs text-purple-600">总 Token</span>
                </div>
                <p className="text-lg font-bold text-purple-700">{formatNumber(selected.totalTokens)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-600">平均每次</span>
                </div>
                <p className="text-lg font-bold text-green-700">{formatNumber(selected.avgTokensPerCall)}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-orange-600" />
                  <span className="text-xs text-orange-600">总成本</span>
                </div>
                <p className="text-lg font-bold text-orange-700">{formatCost(selected.totalCost)}</p>
              </div>
            </div>

            {/* 模型分布 */}
            {Object.keys(selected.modelDistribution).length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">模型调用分布</p>
                <div className="space-y-2">
                  {Object.entries(selected.modelDistribution).map(([model, count]) => {
                    const pct = ((count / selected.callCount) * 100).toFixed(1);
                    return (
                      <div key={model} className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{model}</Badge>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-16 text-right">{count}次 ({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Token 分布 */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Token 消耗分布</p>
              <div className="space-y-2">
                {Object.entries(selected.tokenDistribution).map(([model, tokens]) => {
                  const pct = ((tokens / selected.totalTokens) * 100).toFixed(1);
                  const color = model.includes("claude") ? "bg-purple-500" : "bg-blue-500";
                  return (
                    <div key={model} className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{model}</Badge>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-24 text-right">
                          {formatNumber(tokens)} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 输入输出 */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">输入 Token</p>
                <p className="text-sm font-semibold">{formatNumber(selected.totalInputTokens)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">输出 Token</p>
                <p className="text-sm font-semibold">{formatNumber(selected.totalOutputTokens)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!selected && (
        <Card className="hidden lg:flex items-center justify-center h-full min-h-[300px]">
          <div className="text-center text-gray-400">
            <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">点击左侧 Agent 查看详情</p>
          </div>
        </Card>
      )}
    </div>
  );
}

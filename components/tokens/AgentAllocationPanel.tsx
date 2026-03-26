"use client";

import { useState } from "react";
import { useBindingsOverview } from "@/hooks/useAgentTokenBindings";
import { useApiTokenList } from "@/hooks/useApiTokens";
import { useAgentList } from "@/hooks/useAgents";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-green-100 text-green-700",
  anthropic: "bg-orange-100 text-orange-700",
  deepseek: "bg-blue-100 text-blue-700",
  custom: "bg-gray-100 text-gray-700",
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  custom: "自定义",
};

export function AgentAllocationPanel() {
  const { data: overview, isLoading: overviewLoading } = useBindingsOverview();
  const { data: agentsData, isLoading: agentsLoading } = useAgentList();
  const { data: tokensData, isLoading: tokensLoading } = useApiTokenList({ pageSize: 100 });

  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const isLoading = overviewLoading || agentsLoading || tokensLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Agent Token 分配</h2>
            <p className="text-sm text-muted-foreground">
              为每个 Agent 分配 API Token 访问权限
            </p>
          </div>
        </div>
        {/* Skeleton: 3 agent cards */}
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                  <div>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1" />
                    <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="space-y-2 pl-13">
                {[...Array(2)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2 ml-13">
                    <div className="h-3 w-3 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const agents = agentsData?.data || [];
  const allTokens = tokensData?.data || [];
  const bindingsByAgent: Record<string, typeof overview.data.bindings> = {};

  if (overview?.data) {
    for (const item of overview.data.tokens || []) {
      for (const binding of item.bindings || []) {
        if (!bindingsByAgent[binding.agentName]) {
          bindingsByAgent[binding.agentName] = [];
        }
        bindingsByAgent[binding.agentName].push(binding);
      }
    }
  }

  // Build agent→tokens mapping from bindingsByAgent
  const agentTokenMap: Record<string, typeof allTokens> = {};
  for (const [agentName, bindings] of Object.entries(bindingsByAgent)) {
    const tokens = bindings.map((b) => {
      const tokenItem = overview?.data?.tokens?.find((t) =>
        t.bindings.some((tb) => tb.id === b.id)
      );
      return tokenItem?.token;
    }).filter(Boolean);
    agentTokenMap[agentName] = tokens;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agent Token 分配</h2>
          <p className="text-sm text-muted-foreground">
            为每个 Agent 分配 API Token 访问权限
          </p>
        </div>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>暂无可用 Agent</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {agents.map((agent: { name: string; status?: string }) => {
            const bindings = bindingsByAgent[agent.name] || [];
            const tokens = agentTokenMap[agent.name] || [];
            const isExpanded = expandedAgent === agent.name;

            return (
              <Card key={agent.name}>
                <CardContent className="p-4">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() =>
                      setExpandedAgent(isExpanded ? null : agent.name)
                    }
                  >
                    {/* Agent name */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{agent.name}</span>
                        <Badge
                          variant={agent.status === "online" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {agent.status || "离线"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        已分配 {tokens.length} 个 Token
                      </div>
                    </div>

                    {/* Bound tokens preview */}
                    <div className="flex gap-1 flex-wrap justify-end">
                      {tokens.slice(0, 3).map((token: { id: string; provider: string; alias: string }) => (
                        <span
                          key={token.id}
                          className={`text-xs px-2 py-0.5 rounded font-medium ${PROVIDER_COLORS[token.provider] || PROVIDER_COLORS.custom}`}
                        >
                          {PROVIDER_LABELS[token.provider] || token.provider}
                        </span>
                      ))}
                      {tokens.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{tokens.length - 3}
                        </span>
                      )}
                    </div>

                    <Settings className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>

                  {/* Expanded binding list */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        当前绑定的 Token
                      </div>
                      {bindings.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          暂未分配 Token
                        </p>
                      ) : (
                        bindings.map((binding: { id: string; tokenId: string; priority: number; levels: string[]; enabled: boolean; token?: { id: string; provider: string; alias: string } }) => {
                          const token = allTokens.find((t) => t.id === binding.tokenId) || binding.token;
                          return (
                            <div
                              key={binding.id}
                              className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                            >
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-blue-700">
                                  P{binding.priority}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {token && (
                                    <span
                                      className={`text-xs px-1.5 py-0.5 rounded font-medium ${PROVIDER_COLORS[token.provider] || PROVIDER_COLORS.custom}`}
                                    >
                                      {PROVIDER_LABELS[token.provider] || token.provider}
                                    </span>
                                  )}
                                  <span className="text-sm font-medium truncate">
                                    {token?.alias || binding.tokenId}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {binding.levels?.length > 0 ? binding.levels.join(", ") : "全部层级"}
                                </div>
                              </div>
                              <Switch checked={binding.enabled} disabled />
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

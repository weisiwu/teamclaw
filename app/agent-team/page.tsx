"use client";

import { useState } from "react";
import { useAgentList, useTeamOverview } from "@/hooks/useAgents";
import { AgentCard } from "@/components/agent-team/AgentCard";
import { HierarchyChart } from "@/components/agent-team/HierarchyChart";
import { AgentDetailPanel } from "@/components/agent-team/AgentDetailPanel";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { Agent } from "@/lib/api/agents";

export default function AgentTeamPage() {
  const { data: agents, isLoading, error, refetch } = useAgentList();
  const { data: overview } = useTeamOverview();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Agent 团队</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          加载数据失败，请检查后端服务是否运行（localhost:9700）
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent 团队</h1>
            <p className="text-sm text-gray-500">
              {agents ? `${agents.length} 个 Agent 在线` : "加载中..."}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="刷新"
        >
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-500">加载 Agent 数据...</span>
        </div>
      ) : (
        <>
          {/* Hierarchy Chart */}
          {overview && (
            <HierarchyChart
              overview={overview}
              selectedAgent={selectedAgent?.name || null}
              onSelectAgent={(name) => {
                const a = agents?.find((ag) => ag.name === name);
                if (a) setSelectedAgent(a);
              }}
            />
          )}

          {/* Agent Cards Grid */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">团队成员</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {agents?.map((agent) => (
                <AgentCard
                  key={agent.name}
                  agent={agent}
                  isSelected={selectedAgent?.name === agent.name}
                  onClick={() => setSelectedAgent(agent)}
                />
              ))}
            </div>
          </div>

          {/* Dispatch Matrix Info */}
          {overview && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">指派规则矩阵</h3>
              <div className="space-y-2">
                {Object.entries(overview.dispatchMatrix).map(([from, toList]) => (
                  <div key={from} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700 w-20">{from}</span>
                    <span className="text-gray-400">→</span>
                    <div className="flex gap-1.5">
                      {toList.map((to) => (
                        <span key={to} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                          {to}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                规则：高级可指派低级（Lv3 → Lv2 → Lv1），反向不可
              </p>
            </div>
          )}
        </>
      )}

      {/* Detail Panel */}
      {selectedAgent && (
        <AgentDetailPanel
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}

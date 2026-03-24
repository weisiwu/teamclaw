"use client";

import { useState } from "react";
import { Agent } from "@/lib/api/agents";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { AgentTokenConfigTab } from "./AgentTokenConfigTab";
import { AgentToolPermissionTab } from "./AgentToolPermissionTab";
import { useUpdateAgentConfig } from "@/hooks/useAgents";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { X, Settings, Clock, Activity, Loader2, CheckCircle, Key, Shield } from "lucide-react";

interface AgentDetailPanelProps {
  agent: Agent;
  onClose: () => void;
}

const LEVEL_COLORS: Record<number, string> = {
  3: "text-purple-600 bg-purple-50 border-purple-200",
  2: "text-blue-600 bg-blue-50 border-blue-200",
  1: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

export function AgentDetailPanel({ agent, onClose }: AgentDetailPanelProps) {
  const [defaultModel, setDefaultModel] = useState(agent.defaultModel);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const updateConfig = useUpdateAgentConfig();

  const levelColor = LEVEL_COLORS[agent.level] || LEVEL_COLORS[1];

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync({
        name: agent.name,
        updates: { defaultModel },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to update config:", err);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold border-2 ${levelColor}`}>
              {agent.name[0].toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{agent.name}</div>
              <div className="text-sm text-gray-500">{agent.role}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
          <AgentStatusBadge status={agent.status} />
          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${levelColor}`}>
            Lv{agent.level}
          </span>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="px-4 bg-white">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="token-config">
              <Key className="w-4 h-4 mr-1.5" />
              Token 配置
            </TabsTrigger>
            <TabsTrigger value="tool-permissions">
              <Shield className="w-4 h-4 mr-1.5" />
              工具权限
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="overview" className="space-y-5">
              {/* Current Task */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> 当前任务
                </h4>
                <div className="bg-blue-50 rounded-lg p-3">
                  {agent.currentTask ? (
                    <div>
                      <div className="text-sm font-medium text-blue-700">{agent.currentTask}</div>
                      {agent.currentTaskStartedAt && (
                        <div className="text-xs text-blue-400 mt-1">
                          开始于 {new Date(agent.currentTaskStartedAt).toLocaleString("zh-CN")}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-blue-400">暂无进行中的任务</div>
                  )}
                </div>
              </section>

              {/* Description */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">职责描述</h4>
                <p className="text-sm text-gray-600">{agent.description}</p>
              </section>

              {/* Capabilities */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">能力列表</h4>
                <div className="flex flex-wrap gap-1.5">
                  {agent.capabilities.map((cap) => (
                    <span key={cap} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {cap}
                    </span>
                  ))}
                </div>
              </section>

              {/* Config */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> 配置
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">默认模型</label>
                    <input
                      type="text"
                      value={defaultModel}
                      onChange={(e) => setDefaultModel(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">工作空间</label>
                    <div className="text-sm text-gray-600 font-mono bg-gray-50 rounded-lg px-3 py-2">
                      {agent.workspace}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">负载评分</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all"
                          style={{ width: `${agent.loadScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8">{agent.loadScore}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Timestamps */}
              <section>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> 时间信息
                </h4>
                <div className="space-y-2 text-sm">
                  {agent.lastHeartbeat && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">最后心跳</span>
                      <span className="text-gray-700">{new Date(agent.lastHeartbeat).toLocaleString("zh-CN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">群聊暴露</span>
                    <span className="text-gray-700">{agent.inGroup ? "是" : "否"}</span>
                  </div>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="token-config">
              <AgentTokenConfigTab agentName={agent.name} />
            </TabsContent>

            <TabsContent value="tool-permissions">
              <AgentToolPermissionTab agentName={agent.name} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center gap-3">
          {activeTab === "overview" ? (
            <>
              <button
                onClick={handleSave}
                disabled={updateConfig.isPending || saved}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  saved
                    ? "bg-green-500 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                }`}
              >
                {updateConfig.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> 保存中...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> 已保存
                  </>
                ) : (
                  "保存配置"
                )}
              </button>
              <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-100 transition-colors">
                关闭
              </button>
            </>
          ) : (
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              关闭
            </button>
          )}
        </div>
      </div>
    </>
  );
}

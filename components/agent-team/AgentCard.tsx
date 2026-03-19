"use client";

import { Agent } from "@/lib/api/agents";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { ChevronRight, Users, Cpu } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
  isSelected?: boolean;
}

const LEVEL_COLORS: Record<number, string> = {
  3: "from-purple-500 to-indigo-600",
  2: "from-blue-500 to-cyan-600",
  1: "from-emerald-500 to-teal-600",
};

const ROLE_ICONS: Record<string, string> = {
  "主管": "👑",
  "产品经理": "📋",
  "代码审查": "🔍",
  "程序员1号": "💻",
  "程序员2号": "⚡",
};

export function AgentCard({ agent, onClick, isSelected }: AgentCardProps) {
  const levelColor = LEVEL_COLORS[agent.level] || LEVEL_COLORS[1];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
        isSelected ? "border-blue-500 shadow-lg ring-2 ring-blue-100" : "border-gray-100 hover:border-blue-200"
      }`}
    >
      {/* Header with level gradient */}
      <div className={`rounded-t-lg bg-gradient-to-r ${levelColor} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{ROLE_ICONS[agent.role] || "🤖"}</span>
            <div>
              <div className="font-semibold text-base">{agent.name}</div>
              <div className="text-xs opacity-80">Lv{agent.level} · {agent.role}</div>
            </div>
          </div>
          <AgentStatusBadge status={agent.status} />
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <p className="text-sm text-gray-600 line-clamp-2">{agent.description}</p>

        {agent.currentTask && (
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-xs text-blue-500 font-medium mb-0.5">当前任务</div>
            <div className="text-xs text-blue-700 truncate">{agent.currentTask}</div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {agent.inGroup && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> 群聊
              </span>
            )}
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Lv{agent.level}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      </div>
    </button>
  );
}

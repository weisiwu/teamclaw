"use client";

import { TeamOverview } from "@/lib/api/agents";

interface HierarchyChartProps {
  overview: TeamOverview;
  selectedAgent: string | null;
  onSelectAgent: (name: string) => void;
}

export function HierarchyChart({ overview, selectedAgent, onSelectAgent }: HierarchyChartProps) {
  const { levels } = overview;

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">团队等级架构</h3>

      <div className="relative">
        {/* Lv3 - Top */}
        <div className="flex justify-center mb-4">
          {levels
            .filter((l) => l.level === 3)
            .flatMap((l) => l.agents)
            .map((agent) => (
              <button
                key={agent.name}
                onClick={() => onSelectAgent(agent.name)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedAgent === agent.name
                    ? "bg-purple-600 text-white shadow-lg scale-105"
                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                }`}
              >
                👑 {agent.name}
              </button>
            ))}
        </div>

        {/* Connector line from Lv3 to Lv2 */}
        <div className="flex justify-center mb-2">
          <div className="w-0.5 h-6 bg-gradient-to-b from-purple-400 to-blue-400" />
        </div>
        <div className="flex justify-center mb-4 gap-8">
          {/* Left connector */}
          <div className="w-16 border-t-2 border-l-2 border-r-0 border-b-0 border-blue-300 rounded-tl-xl" />
          {/* Right connector space */}
          <div className="w-16" />
        </div>

        {/* Lv2 */}
        <div className="flex justify-center gap-6 mb-4">
          {levels
            .filter((l) => l.level === 2)
            .flatMap((l) => l.agents)
            .map((agent) => (
              <button
                key={agent.name}
                onClick={() => onSelectAgent(agent.name)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedAgent === agent.name
                    ? "bg-blue-600 text-white shadow-lg scale-105"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                {agent.name === "pm" ? "📋" : "🔍"} {agent.name}
              </button>
            ))}
        </div>

        {/* Connector from Lv2 to Lv1 */}
        <div className="flex justify-center mb-2">
          <div className="w-0.5 h-6 bg-gradient-to-b from-blue-400 to-emerald-400" />
        </div>
        <div className="flex justify-center mb-4">
          <div className="w-0.5 h-3 bg-gradient-to-b from-blue-300 to-emerald-300 rounded-b" />
        </div>

        {/* Lv1 */}
        <div className="flex justify-center gap-6">
          {levels
            .filter((l) => l.level === 1)
            .flatMap((l) => l.agents)
            .map((agent) => (
              <button
                key={agent.name}
                onClick={() => onSelectAgent(agent.name)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedAgent === agent.name
                    ? "bg-emerald-600 text-white shadow-lg scale-105"
                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                }`}
              >
                💻 {agent.name}
              </button>
            ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t flex items-center justify-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-500" /> Lv3 决策层
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-500" /> Lv2 策划层
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-500" /> Lv1 执行层
        </span>
      </div>
    </div>
  );
}

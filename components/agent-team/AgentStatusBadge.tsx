"use client";

import { AgentStatus } from "@/lib/api/agents";

interface AgentStatusBadgeProps {
  status: AgentStatus;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<AgentStatus, { label: string; className: string }> = {
  idle: { label: "空闲", className: "bg-green-100 text-green-700 border-green-200" },
  busy: { label: "忙碌", className: "bg-blue-100 text-blue-700 border-blue-200" },
  error: { label: "异常", className: "bg-red-100 text-red-700 border-red-200" },
  offline: { label: "离线", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

export function AgentStatusBadge({ status, size = "md" }: AgentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.offline;
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.className} ${sizeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === "idle" ? "bg-green-500" :
        status === "busy" ? "bg-blue-500" :
        status === "error" ? "bg-red-500" : "bg-gray-400"
      }`} />
      {config.label}
    </span>
  );
}

"use client";

/**
 * Agent 监控页面
 * 展示 Agent 健康状态、执行统计、当前执行状态
 */

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/layout/PermissionGuard";
import {
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  WifiOff,
  Loader2,
} from "lucide-react";

const AGENT_NAMES = ["main", "pm", "reviewer", "coder1", "coder2"];

const STATUS_COLORS: Record<string, string> = {
  healthy: "bg-green-100 text-green-800",
  degraded: "bg-yellow-100 text-yellow-800",
  unhealthy: "bg-red-100 text-red-800",
  offline: "bg-gray-200 text-gray-500",
};

interface AgentHealthData {
  name: string;
  status: string;
  lastHeartbeat: string | null;
  consecutiveMissedHeartbeats: number;
  uptime: string;
  totalExecutions: number;
  failureRate: number;
  avgResponseTime: number;
  issues: string[];
  recommendations: string[];
}

interface HealthReportData {
  overall: string;
  checkedAt: string;
  agents: AgentHealthData[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    offline: number;
  };
}

interface AgentStats {
  total: number;
  completed: number;
  failed: number;
  timeout: number;
  avgDurationMs: number;
}

function AgentHealthCard({ agent }: { agent: AgentHealthData }) {
  const statusIcon = {
    healthy: <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />,
    degraded: <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />,
    unhealthy: <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />,
    offline: <WifiOff className="w-4 h-4 text-gray-400 dark:text-gray-500" />,
  }[agent.status] || <WifiOff className="w-4 h-4 text-gray-400" />;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{agent.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {agent.lastHeartbeat
              ? `心跳: ${new Date(agent.lastHeartbeat).toLocaleTimeString()}`
              : "无心跳记录"}
          </p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${STATUS_COLORS[agent.status] || "bg-gray-100 dark:bg-slate-700"}`}>
          {statusIcon}
          <span className="capitalize">{agent.status}</span>
        </div>
      </div>

      {/* 统计数据 */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-center">
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded p-2">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{agent.totalExecutions}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">总执行</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded p-2">
          <div className="text-lg font-bold text-green-700 dark:text-green-400">
            {((1 - agent.failureRate) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">成功率</div>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded p-2">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {agent.avgResponseTime > 0
              ? `${Math.round(agent.avgResponseTime / 1000)}s`
              : "-"}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">平均耗时</div>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded p-2">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{agent.uptime || "-"}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">运行时长</div>
        </div>
      </div>

      {/* 问题列表 */}
      {agent.issues?.length > 0 && (
        <div className="mb-3 space-y-1">
          {agent.issues.map((issue: string, i: number) => (
            <div key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {issue}
            </div>
          ))}
        </div>
      )}

      {/* 建议列表 */}
      {agent.recommendations?.length > 0 && (
        <div className="space-y-1">
          {agent.recommendations.map((rec: string, i: number) => (
            <div key={i} className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1">
              <span className="text-blue-400 dark:text-blue-500">→</span> {rec}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function AgentMonitorPage() {
  const [healthData, setHealthData] = useState<HealthReportData | null>(null);
  const [statsData, setStatsData] = useState<Record<string, AgentStats> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, statsRes] = await Promise.all([
        fetch("/api/v1/agents/health"),
        fetch("/api/v1/agents/executions/stats"),
      ]);
      const healthJson = await healthRes.json();
      const statsJson = await statsRes.json();
      setHealthData(healthJson.data);
      setStatsData(statsJson.data);
    } catch (err) {
      console.error("Failed to fetch agent data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(); // initial fetch
    const interval = setInterval(fetchData, 30000); // poll every 30s for real-time health data
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleHealthCheck = async () => {
    setIsChecking(true);
    try {
      await fetch("/api/v1/agents/health/check", { method: "POST" });
      await fetchData();
    } finally {
      setIsChecking(false);
    }
  };

  const healthReport = healthData;
  const statsMap = statsData || {};

  return (
    <PermissionGuard>
    <div className="page-container space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <Activity className="w-6 h-6" />
            Agent 监控
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            实时监控 Agent 健康状态与执行统计
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
          <Button variant="default" size="sm" onClick={handleHealthCheck} disabled={isChecking}>
            {isChecking ? (
              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Activity className="w-4 h-4 mr-1" />
            )}
            健康检查
          </Button>
        </div>
      </div>

      {/* 总体状态卡片 */}
      {healthReport && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className={`text-2xl font-bold ${
              healthReport.overall === "healthy" ? "text-green-600" :
              healthReport.overall === "degraded" ? "text-yellow-600" : "text-red-600"
            }`}>
              {healthReport.overall?.toUpperCase() || "UNKNOWN"}
            </div>
            <div className="text-sm text-gray-500">总体状态</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{healthReport.summary?.healthy || 0}</div>
            <div className="text-sm text-gray-500">健康</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{healthReport.summary?.degraded || 0}</div>
            <div className="text-sm text-gray-500">降级</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {(healthReport.summary?.unhealthy || 0) + (healthReport.summary?.offline || 0)}
            </div>
            <div className="text-sm text-gray-500">异常/离线</div>
          </Card>
        </div>
      )}

      {/* 检查时间 */}
      {healthReport && (
        <div className="text-xs text-gray-400 dark:text-gray-500">
          检查时间: {new Date(healthReport.checkedAt).toLocaleString()}
        </div>
      )}

      {/* Agent 健康卡片网格 */}
      {loading ? (
        <div className="page-loading"><Loader2 className="w-6 h-6 animate-spin" /><span>加载中...</span></div>
      ) : healthReport?.agents ? (
        <div className="grid grid-cols-2 gap-4">
          {healthReport.agents.map((agent: AgentHealthData) => (
            <AgentHealthCard key={agent.name} agent={agent} />
          ))}
        </div>
      ) : (
        <Card className="p-6 text-center text-gray-500">
          暂无健康数据
        </Card>
      )}

      {/* 执行统计表格 */}
      {statsData && (
        <Card className="p-4">
          <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">执行统计</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-slate-700">
                  <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-300">Agent</th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-300">总执行</th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-300">完成</th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-300">失败</th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-300">超时</th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-300">平均耗时</th>
                </tr>
              </thead>
              <tbody>
                {AGENT_NAMES.map((name) => {
                  const stats = statsMap[name] || { total: 0, completed: 0, failed: 0, timeout: 0, avgDurationMs: 0 };
                  return (
                    <tr key={name} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{name}</td>
                      <td className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">{stats.total}</td>
                      <td className="text-right py-2 px-3 text-green-600 dark:text-green-400">{stats.completed}</td>
                      <td className="text-right py-2 px-3 text-red-600 dark:text-red-400">{stats.failed}</td>
                      <td className="text-right py-2 px-3 text-yellow-600 dark:text-yellow-400">{stats.timeout}</td>
                      <td className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">
                        {stats.avgDurationMs > 0
                          ? `${Math.round(stats.avgDurationMs / 1000)}s`
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
    </PermissionGuard>
  );
}

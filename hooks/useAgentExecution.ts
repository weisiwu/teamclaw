/**
 * Agent 执行引擎 React Query Hooks
 */

import { useQuery } from "@tanstack/react-query";
import {
  agentExecutionApi,
  agentHealthApi,
  type ExecutionContext,
  type HealthReport,
} from "@/lib/api/agentExecution";

// ============ 执行引擎 Hooks ============

/** 获取 Agent 执行历史 */
export function useAgentExecutionHistory(params?: {
  agentName?: string;
  dispatcher?: string;
  taskId?: string;
  status?: ExecutionContext["status"];
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["agent-executions", params],
    queryFn: () => agentExecutionApi.getHistory(params),
  });
}

/** 获取单个执行记录 */
export function useAgentExecution(executionId: string) {
  return useQuery({
    queryKey: ["agent-execution", executionId],
    queryFn: () => agentExecutionApi.getExecution(executionId),
    enabled: !!executionId,
  });
}

/** 获取 Agent 当前执行状态 */
export function useAgentExecutionState(agentName: string) {
  return useQuery({
    queryKey: ["agent-execution-state", agentName],
    queryFn: () => agentExecutionApi.getExecutionState(agentName),
  });
}

/** 获取 Agent 执行统计 */
export function useAgentStats(agentName: string) {
  return useQuery({
    queryKey: ["agent-stats", agentName],
    queryFn: () => agentExecutionApi.getStats(agentName),
  });
}

/** 获取所有 Agent 执行统计 */
export function useAllAgentStats() {
  return useQuery({
    queryKey: ["agent-all-stats"],
    queryFn: () => agentExecutionApi.getAllStats(),
  });
}

// ============ 健康监控 Hooks ============

/** 获取团队健康报告 */
export function useAgentHealthReport() {
  return useQuery<{ data: HealthReport }>({
    queryKey: ["agent-health-report"],
    queryFn: () => agentHealthApi.getReport(),
  });
}

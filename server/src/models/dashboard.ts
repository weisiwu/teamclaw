/**
 * Dashboard 模型定义
 * 后台管理平台 - 仪表盘概览数据模型
 */

export interface ProjectStats {
  total: number;
  active: number;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
}

export interface VersionStats {
  total: number;
  latest: string;
}

export interface TokenStats {
  todayUsed: number;
  weekUsed: number;
  monthUsed: number;
  estimatedCost: number;
}

export interface AgentStats {
  total: number;
  busy: number;
  idle: number;
}

export interface DashboardOverview {
  projects: ProjectStats;
  tasks: TaskStats;
  versions: VersionStats;
  tokens: TokenStats;
  agents: AgentStats;
}

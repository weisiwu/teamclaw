/**
 * Dashboard Service
 * 后台管理平台 - 仪表盘概览数据服务
 */

import { DashboardOverview } from '../models/dashboard.js';
import { taskLifecycle } from './taskLifecycle.js';
import { getTeamOverviewData } from './agentService.js';

export class DashboardService {
  /**
   * 获取仪表盘概览数据
   */
  async getOverview(): Promise<DashboardOverview> {
    // Tasks stats from taskLifecycle
    const tasks = taskLifecycle.getAllTasks();
    const completed = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'running').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const cancelled = tasks.filter((t) => t.status === 'cancelled').length;

    // Agent stats
    const teamOverview = await getTeamOverviewData();
    const busy = teamOverview.levels.reduce((sum, lv) => {
      return sum + lv.agents.filter((a) => a.statusRuntime === 'busy').length;
    }, 0);

    // Token stats (simplified - last 30 days from tokenStatsService)
    const { tokenStatsService } = await import('./tokenStatsService.js');
    const summary = await tokenStatsService.getSummary();
    const weekSummary = await tokenStatsService.getSummary(
      new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
    );
    const monthSummary = await tokenStatsService.getSummary(
      new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
    );

    // Today
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecords = await tokenStatsService.getDailyStats(todayStr, todayStr);
    const todayUsed = todayRecords.length > 0 ? todayRecords[0].totalTokens : 0;

    return {
      projects: {
        total: 3,
        active: 2,
      },
      tasks: {
        total: tasks.length,
        completed,
        inProgress,
        pending,
        cancelled,
      },
      versions: {
        total: 10,
        latest: 'v1.2.1',
      },
      tokens: {
        todayUsed,
        weekUsed: weekSummary.totalTokens,
        monthUsed: monthSummary.totalTokens,
        estimatedCost: parseFloat(summary.totalCost.toFixed(2)),
      },
      agents: {
        total: teamOverview.agents.length,
        busy,
        idle: teamOverview.agents.length - busy,
      },
    };
  }
}

export const dashboardService = new DashboardService();

import { NextRequest } from "next/server";
import { generateRequestId, jsonSuccess, jsonError } from "@/lib/api-shared";
import { versionStore, type Version } from "../../versions/version-store";
import { taskApi } from "@/lib/api/tasks";
import { getAllBranches } from "@/lib/branch-store";
import { tokenApi } from "@/lib/api/tokens";
import { agentApi } from "@/lib/api/agents";

/**
 * GET /api/v1/dashboard/overview
 * Returns aggregated dashboard stats for the home page overview cards.
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  try {
    // Fetch all data in parallel for speed
    const [versions, branches, tasksResult, tokenSummary, agents] = await Promise.allSettled([
      // Versions: all from store (no pagination needed for overview)
      Promise.resolve(Array.from(versionStore.values()) as Version[]),
      // Branches
      Promise.resolve(getAllBranches()),
      // Tasks: fetch a decent page to get counts
      taskApi.getList({ status: "all", page: 1, pageSize: 1 }),
      // Tokens summary
      tokenApi.getSummary().catch(() => ({ data: { todayTokens: 0, weekTokens: 0, monthTokens: 0, cost: { todayCost: 0, weekCost: 0, monthCost: 0 } } })),
      // Agents (may fail if backend not available)
      agentApi.getAll().catch(() => []),
    ]);

    // Process versions
    const versionList = versions.status === "fulfilled" ? versions.value : [];
    const latestVersion = versionList.length > 0
      ? versionList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.version
      : "—";

    // Process branches
    const branchList = branches.status === "fulfilled" ? branches.value : [];
    const activeBranches = branchList.filter(b => !b.isProtected).length;

    // Process tasks
    let taskStats = { total: 0, completed: 0, inProgress: 0, pending: 0, cancelled: 0 };
    if (tasksResult.status === "fulfilled") {
      const allTasks = tasksResult.value.data;
      taskStats = {
        total: tasksResult.value.total,
        completed: allTasks.filter(t => t.status === "completed").length,
        inProgress: allTasks.filter(t => t.status === "in_progress").length,
        pending: allTasks.filter(t => t.status === "pending").length,
        cancelled: allTasks.filter(t => t.status === "cancelled").length,
      };
    }

    // Process tokens
    let tokenStats = { todayUsed: 0, weekUsed: 0, monthUsed: 0, estimatedCost: 0 };
    if (tokenSummary.status === "fulfilled") {
      const d = tokenSummary.value.data;
      tokenStats = {
        todayUsed: d.todayTokens || 0,
        weekUsed: d.weekTokens || 0,
        monthUsed: d.monthTokens || 0,
        estimatedCost: d.cost?.monthCost || 0,
      };
    }

    // Process agents
    let agentStats = { total: 0, busy: 0, idle: 0 };
    if (agents.status === "fulfilled") {
      const agentList = agents.value;
      agentStats = {
        total: agentList.length,
        busy: agentList.filter(a => a.status === "busy").length,
        idle: agentList.filter(a => a.status === "idle").length,
      };
    }

    return jsonSuccess({
      projects: {
        total: branches.status === "fulfilled" ? branchList.length : 0,
        active: activeBranches,
      },
      tasks: taskStats,
      versions: {
        total: versionList.length,
        latest: latestVersion,
      },
      tokens: tokenStats,
      agents: agentStats,
    }, requestId);
  } catch (err) {
    console.error("[dashboard/overview] error:", err);
    return jsonError(`获取仪表盘概览失败: ${err instanceof Error ? err.message : String(err)}`, 500, requestId);
  }
}

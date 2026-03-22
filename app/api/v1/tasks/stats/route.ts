import { NextRequest } from "next/server";
import { taskApi } from "@/lib/api/tasks";
import { generateRequestId, jsonSuccess, jsonError, optionsResponse } from "@/lib/api-shared";

/**
 * GET /api/v1/tasks/stats
 * Get task statistics (total, by status, by priority)
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  try {
    // Get all tasks (pageSize large enough to get all)
    const result = await taskApi.getList({ page: 1, pageSize: 1000 });

    const stats = {
      total: result.total,
      byStatus: {
        pending: result.data.filter((t) => t.status === "pending").length,
        in_progress: result.data.filter((t) => t.status === "in_progress").length,
        completed: result.data.filter((t) => t.status === "completed").length,
        cancelled: result.data.filter((t) => t.status === "cancelled").length,
      },
      byPriority: {
        high: result.data.filter((t) => t.priority >= 9).length,
        medium: result.data.filter((t) => t.priority >= 5 && t.priority < 9).length,
        low: result.data.filter((t) => t.priority < 5).length,
      },
      totalTokenCost: result.data.reduce((sum, t) => sum + (t.tokenCost || 0), 0),
    };

    return jsonSuccess(stats, requestId);
  } catch (err) {
    console.error("[tasks/stats] GET error:", err);
    return jsonError("Failed to fetch task stats", 500, requestId);
  }
}

export { optionsResponse as OPTIONS };

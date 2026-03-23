import { NextRequest, NextResponse } from "next/server";
import { taskApi } from "@/lib/api/tasks";
import { generateRequestId, jsonSuccess, jsonError, optionsResponse, requireAuth } from "@/lib/api-shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/tasks/[id]/complete
 * Mark a task as completed
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();
  const { id } = await params;

  // Auth: require any logged-in user
  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const task = await taskApi.complete(id);
    return jsonSuccess(task, requestId);
  } catch (err: unknown) {
    console.error("[tasks/id/complete] POST error:", err);
    if (err instanceof Error && err.message === "任务不存在") {
      return jsonError("Task not found", 404, requestId);
    }
    return jsonError("Failed to complete task", 500, requestId);
  }
}

export { optionsResponse as OPTIONS };

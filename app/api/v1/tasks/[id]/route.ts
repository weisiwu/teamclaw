import { NextRequest } from "next/server";
import { taskApi } from "@/lib/api/tasks";
import { generateRequestId, jsonSuccess, jsonError, optionsResponse } from "@/lib/api-shared";
import type { UpdateTaskRequest } from "@/lib/api/types";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/tasks/[id]
 * Get a single task by ID
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();
  const { id } = await params;

  try {
    const task = await taskApi.getById(id);
    if (!task) {
      return jsonError("Task not found", 404, requestId);
    }
    return jsonSuccess(task, requestId);
  } catch (err) {
    console.error("[tasks/id] GET error:", err);
    return jsonError("Failed to fetch task", 500, requestId);
  }
}

/**
 * PATCH /api/v1/tasks/[id]
 * Update a task (status, priority, title, description)
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();
  const { id } = await params;

  try {
    const body: UpdateTaskRequest = await request.json();

    // Validation
    if (body.title !== undefined && body.title.trim().length === 0) {
      return jsonError("Task title cannot be empty", 400, requestId);
    }
    if (body.title !== undefined && body.title.trim().length > 200) {
      return jsonError("Task title must be 200 characters or less", 400, requestId);
    }
    if (body.priority !== undefined && (body.priority < 1 || body.priority > 10)) {
      return jsonError("Priority must be between 1 and 10", 400, requestId);
    }
    if (body.status !== undefined) {
      const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
      if (!validStatuses.includes(body.status)) {
        return jsonError(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400, requestId);
      }
    }

    const task = await taskApi.update(id, body);
    return jsonSuccess(task, requestId);
  } catch (err: unknown) {
    console.error("[tasks/id] PATCH error:", err);
    if (err instanceof Error && err.message === "任务不存在") {
      return jsonError("Task not found", 404, requestId);
    }
    return jsonError("Failed to update task", 500, requestId);
  }
}

/**
 * DELETE /api/v1/tasks/[id]
 * Delete a task
 */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();
  const { id } = await params;

  try {
    await taskApi.delete(id);
    return jsonSuccess({ deleted: true }, requestId);
  } catch (err: unknown) {
    console.error("[tasks/id] DELETE error:", err);
    if (err instanceof Error && err.message === "任务不存在") {
      return jsonError("Task not found", 404, requestId);
    }
    return jsonError("Failed to delete task", 500, requestId);
  }
}

export { optionsResponse as OPTIONS };

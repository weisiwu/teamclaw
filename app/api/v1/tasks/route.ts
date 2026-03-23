import { NextRequest, NextResponse } from "next/server";
import { taskApi } from "@/lib/api/tasks";
import { generateRequestId, jsonSuccess, jsonError, optionsResponse, requireAuth } from "@/lib/api-shared";
import type { TaskFilters, CreateTaskRequest } from "@/lib/api/types";

/**
 * GET /api/v1/tasks
 * List tasks with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  // Auth: require any logged-in user
  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const filters: TaskFilters = {
      search: searchParams.get("search") || undefined,
      status: (searchParams.get("status") as TaskFilters["status"]) || "all",
      priority: searchParams.get("priority") || "all",
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "10"),
    };

    const result = await taskApi.getList(filters);

    return jsonSuccess({
      items: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    }, requestId);
  } catch (err) {
    console.error("[tasks] GET error:", err);
    return jsonError("Failed to fetch tasks", 500, requestId);
  }
}

/**
 * POST /api/v1/tasks
 * Create a new task
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  // Auth: require any logged-in user
  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body: CreateTaskRequest = await request.json();

    // Validation
    if (!body.title || body.title.trim().length === 0) {
      return jsonError("Task title is required", 400, requestId);
    }
    if (body.title.trim().length > 200) {
      return jsonError("Task title must be 200 characters or less", 400, requestId);
    }
    if (body.priority !== undefined && (body.priority < 1 || body.priority > 10)) {
      return jsonError("Priority must be between 1 and 10", 400, requestId);
    }

    const task = await taskApi.create(body);
    return jsonSuccess(task, requestId);
  } catch (err) {
    console.error("[tasks] POST error:", err);
    return jsonError("Failed to create task", 500, requestId);
  }
}

export { optionsResponse as OPTIONS };

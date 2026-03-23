import { NextRequest, NextResponse } from "next/server";
import { taskApi } from "@/lib/api/tasks";
import { generateRequestId, jsonSuccess, jsonError, optionsResponse, requireAuth } from "@/lib/api-shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/tasks/[id]/comments
 * List comments for a task
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();
  const { id } = await params;

  // Auth: require any logged-in user
  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const task = await taskApi.getById(id);
    if (!task) {
      return jsonError("Task not found", 404, requestId);
    }
    const comments = await taskApi.getComments(id);
    return jsonSuccess(comments, requestId);
  } catch (err) {
    console.error("[tasks/id/comments] GET error:", err);
    return jsonError("Failed to fetch comments", 500, requestId);
  }
}

/**
 * POST /api/v1/tasks/[id]/comments
 * Add a comment to a task
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();
  const { id } = await params;

  // Auth: require any logged-in user
  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { content, author } = body;

    if (!content || content.trim().length === 0) {
      return jsonError("Comment content is required", 400, requestId);
    }
    if (content.trim().length > 2000) {
      return jsonError("Comment must be 2000 characters or less", 400, requestId);
    }

    const task = await taskApi.getById(id);
    if (!task) {
      return jsonError("Task not found", 404, requestId);
    }

    const comment = await taskApi.addComment(id, content.trim(), author || "Anonymous");
    return jsonSuccess(comment, requestId);
  } catch (err) {
    console.error("[tasks/id/comments] POST error:", err);
    return jsonError("Failed to add comment", 500, requestId);
  }
}

export { optionsResponse as OPTIONS };

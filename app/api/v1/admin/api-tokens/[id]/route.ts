import { NextRequest, NextResponse } from "next/server";
import { generateRequestId, jsonSuccess, jsonError, requireAuth } from "@/lib/api-shared";

const BACKEND_BASE = process.env.BACKEND_URL || "http://localhost:3001";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/admin/api-tokens/:id
 * Get a single API token
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const url = `${BACKEND_BASE}/api/v1/admin/api-tokens/${id}`;
    const resp = await fetch(url, {
      headers: {
        "X-Request-ID": requestId,
        Cookie: request.headers.get("Cookie") || "",
      },
      credentials: "include",
    });

    const data = await resp.json();
    return jsonSuccess(data, requestId);
  } catch (err) {
    console.error("[api-tokens:id] GET error:", err);
    return jsonError("Failed to fetch API token", 500, requestId);
  }
}

/**
 * PUT /api/v1/admin/api-tokens/:id
 * Update an API token
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const url = `${BACKEND_BASE}/api/v1/admin/api-tokens/${id}`;

    const resp = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        Cookie: request.headers.get("Cookie") || "",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return jsonError(data.message || "Failed to update API token", resp.status, requestId);
    }
    return jsonSuccess(data, requestId);
  } catch (err) {
    console.error("[api-tokens:id] PUT error:", err);
    return jsonError("Failed to update API token", 500, requestId);
  }
}

/**
 * DELETE /api/v1/admin/api-tokens/:id
 * Delete an API token
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const url = `${BACKEND_BASE}/api/v1/admin/api-tokens/${id}`;
    const resp = await fetch(url, {
      method: "DELETE",
      headers: {
        "X-Request-ID": requestId,
        Cookie: request.headers.get("Cookie") || "",
      },
      credentials: "include",
    });

    if (!resp.ok) {
      const data = await resp.json();
      return jsonError(data.message || "Failed to delete API token", resp.status, requestId);
    }
    return jsonSuccess({ deleted: true }, requestId);
  } catch (err) {
    console.error("[api-tokens:id] DELETE error:", err);
    return jsonError("Failed to delete API token", 500, requestId);
  }
}

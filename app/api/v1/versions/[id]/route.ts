import { NextRequest, NextResponse } from "next/server";
import { versionStore, type Version } from "../version-store";
import { generateRequestId, jsonSuccess, jsonError, optionsResponse, requireAuth, requireAdmin, requireElevatedRole } from "@/lib/api-shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/versions/[id]
 * Get a single version by ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();
  try {
    const { id } = await context.params;
    const version = versionStore.get(id);
    if (!version) {
      return jsonError("Version not found", 404, requestId);
    }
    return jsonSuccess(version, requestId);
  } catch (err) {
    console.error("[versions/[id] GET]", err);
    return jsonError("Internal server error", 500, requestId);
  }
}

/**
 * PUT /api/v1/versions/[id]
 * Replace a version (full update) — requires auth
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  // Auth: require elevated role for full version replacement
  const authResult = requireElevatedRole(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await context.params;
    const existing = versionStore.get(id);
    if (!existing) {
      return jsonError("Version not found", 404, requestId);
    }
    const body = await request.json() as Partial<Version>;
    if (!body || Object.keys(body).length === 0) {
      return jsonError("Request body is required", 400, requestId);
    }
    // Disallow changing id
    if (body.id !== undefined && body.id !== id) {
      return jsonError("Cannot change version ID", 400, requestId);
    }
    const updated: Version = { ...existing, ...body, id };
    versionStore.set(id, updated);
    return jsonSuccess(updated, requestId);
  } catch (err) {
    console.error("[versions/[id] PUT]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 400, requestId);
  }
}

/**
 * PATCH /api/v1/versions/[id]
 * Partially update a version (e.g. update buildStatus, summary) — requires auth
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  // Auth: require authentication for partial updates
  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await context.params;
    const existing = versionStore.get(id);
    if (!existing) {
      return jsonError("Version not found", 404, requestId);
    }
    const body = await request.json() as Partial<Version>;
    if (!body || Object.keys(body).length === 0) {
      return jsonError("Request body is required", 400, requestId);
    }
    // Disallow changing id
    if (body.id !== undefined && body.id !== id) {
      return jsonError("Cannot change version ID", 400, requestId);
    }
    const updated: Version = { ...existing, ...body, id };
    versionStore.set(id, updated);
    return jsonSuccess(updated, requestId);
  } catch (err) {
    console.error("[versions/[id] PATCH]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 400, requestId);
  }
}

/**
 * DELETE /api/v1/versions/[id]
 * Delete a version — requires admin role (destructive operation)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  // Auth: require admin for destructive delete operation
  const authResult = requireAdmin(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await context.params;
    const existing = versionStore.get(id);
    if (!existing) {
      return jsonError("Version not found", 404, requestId);
    }
    versionStore.delete(id);
    return jsonSuccess({ deleted: true, id }, requestId);
  } catch (err) {
    console.error("[versions/[id] DELETE]", err);
    return jsonError("Internal server error", 500, requestId);
  }
}

export { optionsResponse as OPTIONS };

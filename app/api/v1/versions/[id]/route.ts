import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/versions/[id] — get a single version
 * Proxy to Express backend: GET /api/v1/versions/:id
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  return proxyNextToBackend(request, `/api/v1/versions/${id}`);
}

/**
 * PUT /api/v1/versions/[id] — replace a version
 * Proxy to Express backend: PUT /api/v1/versions/:id
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  return proxyNextToBackend(request, `/api/v1/versions/${id}`, { method: "PUT" });
}

/**
 * PATCH /api/v1/versions/[id] — partially update a version
 * Proxy to Express backend: PATCH /api/v1/versions/:id
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  return proxyNextToBackend(request, `/api/v1/versions/${id}`, { method: "PATCH" });
}

/**
 * DELETE /api/v1/versions/[id] — delete a version
 * Proxy to Express backend: DELETE /api/v1/versions/:id
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  return proxyNextToBackend(request, `/api/v1/versions/${id}`, { method: "DELETE" });
}

export { optionsResponse as OPTIONS };

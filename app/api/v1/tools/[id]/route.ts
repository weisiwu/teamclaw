import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/tools/[id] — get a single tool
 * PUT /api/v1/tools/[id] — update a tool
 * DELETE /api/v1/tools/[id] — delete a tool
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyNextToBackend(request, `/api/v1/tools/${id}`);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyNextToBackend(request, `/api/v1/tools/${id}`, { method: "PUT" });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyNextToBackend(request, `/api/v1/tools/${id}`, { method: "DELETE" });
}

export { optionsResponse as OPTIONS };

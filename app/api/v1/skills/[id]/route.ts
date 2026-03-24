import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/skills/[id] — get a single skill
 * PUT /api/v1/skills/[id] — update a skill
 * DELETE /api/v1/skills/[id] — delete a skill
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyNextToBackend(request, `/api/v1/skills/${id}`);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyNextToBackend(request, `/api/v1/skills/${id}`, { method: "PUT" });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyNextToBackend(request, `/api/v1/skills/${id}`, { method: "DELETE" });
}

export { optionsResponse as OPTIONS };

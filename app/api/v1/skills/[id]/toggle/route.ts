import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/v1/skills/[id]/toggle — toggle skill enabled status
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyNextToBackend(request, `/api/v1/skills/${id}/toggle`, { method: "PUT" });
}

export { optionsResponse as OPTIONS };

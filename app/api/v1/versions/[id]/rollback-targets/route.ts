import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/versions/[id]/rollback-targets
 * Proxy to Express backend: GET /api/v1/versions/:id/rollback-targets
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;
  return proxyNextToBackend(request, `/api/v1/versions/${id}/rollback-targets`);
}

export { optionsResponse as OPTIONS };

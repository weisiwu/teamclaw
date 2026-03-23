import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PUT /api/v1/branches/[id]/checkout
 * Proxy to Express backend: PUT /api/v1/branches/:id/checkout
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  return proxyNextToBackend(request, `/api/v1/branches/${id}/checkout`, { method: "PUT" });
}

export { optionsResponse as OPTIONS };

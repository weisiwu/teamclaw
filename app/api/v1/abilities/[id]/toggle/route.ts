import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";

/**
 * PUT /api/v1/abilities/:id/toggle
 * Proxy to Express backend: PUT /api/v1/abilities/:id/toggle
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return proxyNextToBackend(request, `/api/v1/abilities/${params.id}/toggle`, { method: "PUT" });
}

export const runtime = "nodejs";

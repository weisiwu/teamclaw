import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";

/**
 * GET /api/v1/abilities/:id
 * Proxy to Express backend: GET /api/v1/abilities/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return proxyNextToBackend(request, `/api/v1/abilities/${params.id}`);
}

export const runtime = "nodejs";

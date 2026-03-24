import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";

/**
 * GET /api/v1/abilities
 * Proxy to Express backend: GET /api/v1/abilities
 */
export async function GET(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/abilities");
}

export const runtime = "nodejs";

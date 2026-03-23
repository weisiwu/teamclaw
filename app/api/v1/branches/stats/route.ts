import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

/**
 * GET /api/v1/branches/stats
 * Proxy to Express backend: GET /api/v1/branches/stats
 */
export async function GET(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/branches/stats");
}

export { optionsResponse as OPTIONS };

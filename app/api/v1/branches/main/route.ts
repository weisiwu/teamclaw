import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

/**
 * GET /api/v1/branches/main
 * Proxy to Express backend: GET /api/v1/branches/main
 */
export async function GET(
  request: NextRequest
) {
  return proxyNextToBackend(request, "/api/v1/branches/main");
}

export { optionsResponse as OPTIONS };

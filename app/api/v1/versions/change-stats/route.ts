import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";

/**
 * GET /api/v1/versions/change-stats?tag=versionId
 * Proxy to Express backend: GET /api/v1/versions/change-stats?tag=...
 */
export async function GET(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/versions/change-stats");
}

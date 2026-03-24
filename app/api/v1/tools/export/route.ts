import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

/**
 * GET /api/v1/tools/export — export tools as JSON
 */
export async function GET(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/tools/export");
}

export { optionsResponse as OPTIONS };

import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

/**
 * GET /api/v1/skills/export — export skills as JSON
 */
export async function GET(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/skills/export");
}

export { optionsResponse as OPTIONS };

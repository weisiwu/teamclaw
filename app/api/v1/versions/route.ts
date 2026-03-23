import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

/**
 * GET /api/v1/versions — list versions
 * Proxy to Express backend: GET /api/v1/versions
 */
export async function GET(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/versions");
}

/**
 * POST /api/v1/versions — create version
 * Proxy to Express backend: POST /api/v1/versions
 */
export async function POST(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/versions", { method: "POST" });
}

export { optionsResponse as OPTIONS };

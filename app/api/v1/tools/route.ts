import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

/**
 * GET /api/v1/tools — list tools
 * POST /api/v1/tools — create tool
 */
export async function GET(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/tools");
}

export async function POST(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/tools", { method: "POST" });
}

export { optionsResponse as OPTIONS };

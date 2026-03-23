import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";

/**
 * GET /api/v1/dashboard/overview
 * Proxy to Express backend: GET /api/v1/dashboard/overview
 */
export async function GET(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/dashboard/overview");
}

export const runtime = "nodejs";

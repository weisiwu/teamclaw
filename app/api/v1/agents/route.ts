import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";

/**
 * GET /api/v1/agents
 * POST /api/v1/agents
 * Proxy to Express backend
 */
export async function GET(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/agents");
}

export async function POST(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/agents", { method: "POST" });
}

export const runtime = "nodejs";

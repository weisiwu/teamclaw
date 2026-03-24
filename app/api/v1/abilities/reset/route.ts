import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";

/**
 * POST /api/v1/abilities/reset
 * Proxy to Express backend: POST /api/v1/abilities/reset
 */
export async function POST(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/abilities/reset", { method: "POST" });
}

export const runtime = "nodejs";

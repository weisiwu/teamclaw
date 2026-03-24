import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";

/**
 * POST /api/v1/auth/login
 * Proxy to Express backend: POST /api/v1/auth/login
 */
export async function POST(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/auth/login", { method: "POST" });
}

export const runtime = "nodejs";

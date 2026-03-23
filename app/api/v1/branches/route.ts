import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

// GET /api/v1/branches — list branches
export async function GET(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/branches");
}

// POST /api/v1/branches — create branch
export async function POST(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/branches", { method: "POST" });
}

export { optionsResponse as OPTIONS };

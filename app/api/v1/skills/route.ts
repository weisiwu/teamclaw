import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

/**
 * GET /api/v1/skills — list skills
 * POST /api/v1/skills — create skill
 */
export async function GET(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/skills");
}

export async function POST(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/skills", { method: "POST" });
}

export { optionsResponse as OPTIONS };

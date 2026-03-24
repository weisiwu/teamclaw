import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

/**
 * POST /api/v1/skills/import — import skills from JSON file
 */
export async function POST(request: NextRequest) {
  return proxyNextToBackend(request, "/api/v1/skills/import", { method: "POST" });
}

export { optionsResponse as OPTIONS };

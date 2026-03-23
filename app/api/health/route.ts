import { NextRequest } from "next/server";
import {
  generateRequestId,
  jsonSuccess,
  jsonError,
  optionsResponse,
} from "@/lib/api-shared";

export { optionsResponse as OPTIONS };

/**
 * GET /api/health
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  try {
    const healthData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "teamclaw-frontend",
      uptime: Math.round(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: "MB",
      },
    };

    return jsonSuccess(healthData, requestId);
  } catch (error) {
    console.error("[Health] Error:", error);
    return jsonError("Health check failed", 500, requestId);
  }
}

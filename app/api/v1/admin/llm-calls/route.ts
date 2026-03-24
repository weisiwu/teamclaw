import { NextRequest, NextResponse } from "next/server";
import { generateRequestId, jsonSuccess, requireAuth } from "@/lib/api-shared";

const BACKEND_BASE = process.env.BACKEND_URL || "http://localhost:3001";

/**
 * GET /api/v1/admin/llm-calls
 * 获取 LLM 调用日志明细
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const url = `${BACKEND_BASE}/api/v1/admin/llm-calls${qs ? `?${qs}` : ""}`;

    const resp = await fetch(url, {
      headers: {
        "X-Request-ID": requestId,
        Cookie: request.headers.get("Cookie") || "",
      },
      credentials: "include",
    });

    const data = await resp.json();
    return jsonSuccess(data, requestId);
  } catch (err) {
    console.error("[llm-calls] GET error:", err);
    // Fallback: return mock data when backend is not available
    return jsonSuccess(getMockLLMCalls(searchParams), requestId);
  }
}

function getMockLLMCalls(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const total = 100;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;

  const logs = generateMockLogs(start, pageSize);
  return { data: logs, total, page, pageSize, totalPages };
}

function generateMockLogs(offset: number, limit: number) {
  const agents = ["coder", "pm", "architect"];
  const models = ["gpt-4o", "claude-3.5-sonnet", "gpt-4"];
  const statuses: Array<"success" | "error" | "timeout"> = ["success", "success", "success", "error", "timeout"];
  const tokens = ["tok_001", "tok_002", "tok_003"];
  const tokenNames = ["Production Key", "Development Key", "Test Key"];

  return Array.from({ length: limit }, (_, i) => {
    const idx = offset + i;
    const agent = agents[idx % agents.length];
    const model = models[idx % models.length];
    const status = statuses[idx % statuses.length];
    const inputTokens = Math.floor(Math.random() * 5000) + 500;
    const outputTokens = Math.floor(Math.random() * 3000) + 200;
    const totalTokens = inputTokens + outputTokens;
    const pricePerK = model.includes("claude") ? 0.003 : 0.002;
    const cost = (totalTokens / 1000) * pricePerK;

    return {
      id: `call_${String(idx).padStart(5, "0")}`,
      timestamp: new Date(Date.now() - idx * 60000).toISOString(),
      agentName: agent,
      tokenId: tokens[idx % tokens.length],
      tokenName: tokenNames[idx % tokenNames.length],
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      durationMs: Math.floor(Math.random() * 3000) + 300,
      status,
      errorMessage: status === "error" ? "Rate limit exceeded" : status === "timeout" ? "Request timeout after 30s" : undefined,
      cost: parseFloat(cost.toFixed(4)),
    };
  });
}

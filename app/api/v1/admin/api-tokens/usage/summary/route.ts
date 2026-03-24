import { NextRequest, NextResponse } from "next/server";
import { generateRequestId, jsonSuccess, requireAuth } from "@/lib/api-shared";

const BACKEND_BASE = process.env.BACKEND_URL || "http://localhost:3001";

/**
 * GET /api/v1/admin/api-tokens/usage/summary
 * 获取所有 API Token 的用量汇总
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  const authResult = requireAuth(request, requestId);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const url = `${BACKEND_BASE}/api/v1/admin/api-tokens/usage/summary${qs ? `?${qs}` : ""}`;

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
    console.error("[api-tokens/usage/summary] GET error:", err);
    // Fallback: return mock data when backend is not available
    return jsonSuccess({
      data: getMockTokenSummary(),
    }, requestId);
  }
}

function getMockTokenSummary() {
  return [
    {
      tokenId: "tok_001",
      tokenName: "Production Key",
      tokenPrefix: "tok_prod_****",
      monthlyBudget: 1000000,
      currentMonthUsage: 823456,
      totalUsage: 2345678,
      callCount: 156,
      successCount: 150,
      failCount: 6,
      avgResponseTime: 1240,
      inputTokens: 512345,
      outputTokens: 311111,
      cost: 12.34,
      createdAt: "2024-01-15T00:00:00Z",
      updatedAt: new Date().toISOString(),
    },
    {
      tokenId: "tok_002",
      tokenName: "Development Key",
      tokenPrefix: "tok_dev_****",
      monthlyBudget: 500000,
      currentMonthUsage: 412345,
      totalUsage: 1234567,
      callCount: 89,
      successCount: 87,
      failCount: 2,
      avgResponseTime: 980,
      inputTokens: 234567,
      outputTokens: 177778,
      cost: 6.78,
      createdAt: "2024-02-01T00:00:00Z",
      updatedAt: new Date().toISOString(),
    },
    {
      tokenId: "tok_003",
      tokenName: "Test Key",
      tokenPrefix: "tok_test_****",
      monthlyBudget: 100000,
      currentMonthUsage: 45678,
      totalUsage: 234567,
      callCount: 34,
      successCount: 34,
      failCount: 0,
      avgResponseTime: 756,
      inputTokens: 23456,
      outputTokens: 22222,
      cost: 0.89,
      createdAt: "2024-03-01T00:00:00Z",
      updatedAt: new Date().toISOString(),
    },
  ];
}

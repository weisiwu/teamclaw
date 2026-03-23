import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";
import { optionsResponse } from "@/lib/api-shared";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/v1/branches/[id] — get a single branch
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  return proxyNextToBackend(request, `/api/v1/branches/${id}`);
}

// PUT /api/v1/branches/[id] — update branch
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  return proxyNextToBackend(request, `/api/v1/branches/${id}`, { method: "PUT" });
}

// DELETE /api/v1/branches/[id] — delete branch
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  return proxyNextToBackend(request, `/api/v1/branches/${id}`, { method: "DELETE" });
}

export { optionsResponse as OPTIONS };

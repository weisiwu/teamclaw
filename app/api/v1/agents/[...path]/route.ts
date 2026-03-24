import { NextRequest } from "next/server";
import { proxyNextToBackend } from "@/lib/api-proxy";

/**
 * Catch-all proxy for /api/v1/agents/*
 * Forwards all methods to Express backend
 */
function buildPath(params: { path: string[] }) {
  return `/api/v1/agents/${params.path.join("/")}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyNextToBackend(request, buildPath(params));
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyNextToBackend(request, buildPath(params), { method: "POST" });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyNextToBackend(request, buildPath(params), { method: "PUT" });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyNextToBackend(request, buildPath(params), { method: "DELETE" });
}

export const runtime = "nodejs";

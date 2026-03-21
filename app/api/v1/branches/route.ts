import { NextRequest } from "next/server";
import { corsHeaders, generateRequestId, jsonSuccess, jsonError, optionsResponse } from "@/lib/api-shared";
import { getAllBranches, createBranch } from "@/lib/branch-store";

// GET /api/v1/branches
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const isMain = searchParams.get("isMain");
    const isProtected = searchParams.get("isProtected");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    let branches = getAllBranches();
    if (name) branches = branches.filter(b => b.name.includes(name));
    if (isMain !== null) branches = branches.filter(b => b.isMain === (isMain === "true"));
    if (isProtected !== null) branches = branches.filter(b => b.isProtected === (isProtected === "true"));

    const total = branches.length;
    const start = (page - 1) * pageSize;
    const data = branches.slice(start, start + pageSize);

    return jsonSuccess({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }, requestId);
  } catch (err) {
    return jsonError(`获取分支列表失败: ${err instanceof Error ? err.message : String(err)}`, 500, requestId);
  }
}

// POST /api/v1/branches
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const body = await request.json() as { name?: string; author?: string; versionId?: string; baseBranch?: string; description?: string };

    if (!body.name || typeof body.name !== "string") {
      return jsonError("分支名称不能为空", 400, requestId);
    }
    if (!/^[a-zA-Z0-9_./-]+$/.test(body.name)) {
      return jsonError("分支名称只能包含字母、数字、_、.、/、-", 400, requestId);
    }

    const branch = createBranch(body);
    return jsonSuccess(branch, requestId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 400, requestId);
  }
}

export { optionsResponse as OPTIONS };

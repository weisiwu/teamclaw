import { generateRequestId, jsonSuccess, optionsResponse } from "@/lib/api-shared";
import { getAllBranches } from "@/lib/branch-store";

// GET /api/v1/branches/stats — 获取分支统计
export async function GET() {
  const requestId = generateRequestId();
  const all = getAllBranches();
  const stats = {
    total: all.length,
    main: all.filter(b => b.isMain).length,
    protected: all.filter(b => b.isProtected).length,
    remote: all.filter(b => b.isRemote).length,
  };
  return jsonSuccess(stats, requestId);
}

export { optionsResponse as OPTIONS };

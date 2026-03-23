// ========== Types ==========
export interface Version {
  id: string;
  version: string;
  branch: string;
  summary?: string;
  commitHash?: string;
  createdBy?: string;
  createdAt: string;
  buildStatus: 'pending' | 'building' | 'success' | 'failed' | 'cancelled';
  hasTag: boolean;
  /** Whether this version has associated Feishu message screenshots (iter69) */
  hasScreenshot?: boolean;
  /** Whether this version has an AI-generated or manually edited changelog summary (iter69) */
  hasSummary?: boolean;
  /** Display title */
  title?: string;
  /** Description */
  description?: string;
  /** Tags array */
  tags?: string[];
  /** Git tag name */
  gitTag?: string;
  /** Status: draft | published | archived */
  status?: 'draft' | 'published' | 'archived';
  /** Release timestamp */
  releasedAt?: string | null;
}

// ========== In-memory store ==========
export const versionStore = new Map<string, Version>();

export function initVersionStore() {
  if (versionStore.size > 0) return;
  const now = new Date().toISOString();
  const sampleVersions: Version[] = [
    { id: "v1", version: "v1.0.0", branch: "main", summary: "Initial release", commitHash: "abc1234", createdBy: "system", createdAt: now, buildStatus: "success", hasTag: true, hasScreenshot: false, hasSummary: true, title: "初始版本", description: "团队协作平台初始版本，包含核心功能", tags: ["stable", "latest"], gitTag: "v1.0.0", status: "published", releasedAt: now },
    { id: "v2", version: "v1.1.0", branch: "main", summary: "Feature update", commitHash: "def5678", createdBy: "coder", createdAt: now, buildStatus: "success", hasTag: true, hasScreenshot: true, hasSummary: true, title: "任务管理增强", description: "新增任务筛选、排序、详情页等功能", tags: ["stable"], gitTag: "v1.1.0", status: "published", releasedAt: now },
    { id: "v3", version: "v2.0.0", branch: "main", summary: "Major release", commitHash: "ghi9012", createdBy: "pm", createdAt: now, buildStatus: "building", hasTag: false, hasScreenshot: true, hasSummary: false, title: "成员管理 & 权限", description: "新增成员管理、角色权限系统", tags: ["beta"], gitTag: undefined, status: "draft", releasedAt: null },
    { id: "v4", version: "v1.2.0", branch: "develop", summary: "Cron support", commitHash: "jkl3456", createdBy: "developer", createdAt: now, buildStatus: "success", hasTag: true, hasScreenshot: false, hasSummary: false, title: "定时任务支持", description: "新增 Cron 定时任务管理功能", tags: ["beta"], gitTag: "v1.2.0", status: "published", releasedAt: now },
    { id: "v5", version: "v1.3.0", branch: "main", summary: "Token stats", commitHash: "mno7890", createdBy: "system", createdAt: now, buildStatus: "failed", hasTag: false, hasScreenshot: false, hasSummary: false, title: "Token 统计", description: "新增 Token 消耗统计和趋势分析", tags: [], gitTag: undefined, status: "archived", releasedAt: null },
  ];
  sampleVersions.forEach(v => versionStore.set(v.id, v));
}
initVersionStore();

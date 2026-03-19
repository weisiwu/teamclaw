// Rollback 记录数据模型
// 持久化存储版本回退历史

export interface RollbackRecord {
  id: string;             // 唯一 ID (rb_xxx)
  versionId: string;      // 关联的版本 ID
  versionName: string;    // 版本号，如 v1.0.0
  targetRef: string;      // 回退目标（tag/branch/commit）
  targetType: "tag" | "branch" | "commit";
  mode: "revert" | "checkout";
  previousRef?: string;   // 回退前的引用
  newBranch?: string;     // 如果创建了新分支，记录分支名
  backupCreated: boolean; // 是否创建了备份分支
  message?: string;       // 回退说明
  success: boolean;       // 是否成功
  error?: string;         // 失败原因
  performedBy?: string;   // 执行人
  performedAt: string;    // 执行时间
  createdAt: string;      // 创建时间
}

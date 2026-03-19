// Branch 分支数据模型
// 持久化存储分支记录，支持主分支、保护分支等生命周期管理

export interface BranchRecord {
  id: string;           // 分支唯一 ID (branch_xxx)
  name: string;         // 分支名称，如 main, develop, feature/v2.0.0
  isMain: boolean;      // 是否主分支（默认分支）
  isRemote: boolean;   // 是否远程分支
  isProtected: boolean; // 是否受保护（受保护分支不可删除/重命名）
  createdAt: string;    // 创建时间
  lastCommitAt: string; // 最后一次提交时间
  commitMessage: string; // 最后一次提交信息
  author: string;       // 创建者
  versionId?: string;  // 关联的版本 ID（可选）
  baseBranch?: string; // 基于哪个分支创建
  description?: string; // 分支描述
}

// 分支配置
export interface BranchConfig {
  defaultBranch: string;        // 默认分支名
  protectedBranches: string[]; // 保护分支名列表（glob 模式）
  allowForcePush: boolean;     // 是否允许 force push
  autoCleanupMerged: boolean;   // 是否自动清理已合并分支
}

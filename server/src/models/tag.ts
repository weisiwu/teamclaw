// Tag 生命周期数据模型
// 持久化存储标签记录，支持归档、保护、删除等生命周期管理

export interface TagRecord {
  id: string;           // tag 唯一 ID (tag_xxx)
  name: string;         // Git tag 名称，如 v1.0.0
  versionId: string;    // 关联的版本 ID
  versionName: string; // 关联的版本号，如 v1.0.0
  message?: string;    // Tag annotation 信息
  
  // 生命周期状态
  archived: boolean;    // 是否已归档
  protected: boolean;  // 是否受保护（受保护标签不可删除/覆盖）
  archivedAt?: string;  // 归档时间
  
  // 元数据
  createdAt: string;   // 创建时间
  createdBy?: string;  // 创建人
  commitHash?: string; // 对应的 commit hash
  annotation?: string; // Tag annotation（版本摘要等）
  source: 'auto' | 'manual'; // Tag 创建方式：auto=系统自动创建，manual=手动创建
}

// Tag 配置（与 VersionSettings 中的 tag 配置对应）
export interface TagConfig {
  autoTag: boolean;                // 是否自动创建 tag
  tagPrefix: 'v' | 'release' | 'version' | 'custom'; // 前缀类型
  customPrefix?: string;           // 自定义前缀
  tagOnStatus: string[];           // 在哪些状态时创建 tag (published, draft, etc.)
  maxTagAgeDays?: number;          // 标签最大保留天数（用于自动清理）
  autoArchiveEnabled: boolean;     // 是否自动归档旧版本 tag
}

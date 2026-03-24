/**
 * Skill 数据模型
 * Agent 可参考的知识/流程文档
 */

export type SkillCategory = 'build' | 'deploy' | 'test' | 'structure' | 'coding' | 'review' | 'custom';
export type SkillSource = 'generated' | 'user' | 'imported';

export interface SkillDefinition {
  id: string;
  name: string;                  // 英文标识符（如：project_build_guide）
  displayName: string;           // 显示名称（如：项目构建指南）
  description: string;
  category: SkillCategory;
  source: SkillSource;
  content: string;               // Markdown 内容
  filePath?: string;             // 磁盘文件路径（用于同步）
  applicableAgents: string[];    // 适用的 Agent IDs，空数组表示全部
  enabled: boolean;
  tags: string[];
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  projectId?: string;            // 关联的项目 ID（可选）
}

// 数据库表结构映射（snake_case）
export interface SkillRow {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  source: string;
  content: string;
  file_path: string | null;
  applicable_agents: string;     // JSON array
  enabled: number;               // SQLite: 0/1
  tags: string;                  // JSON array
  version: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  project_id: string | null;
}

// Skill 创建参数
export interface CreateSkillParams {
  name: string;
  displayName: string;
  description: string;
  category: SkillCategory;
  content: string;
  filePath?: string;
  applicableAgents?: string[];
  tags?: string[];
  version?: string;
  projectId?: string;
}

// Skill 更新参数
export interface UpdateSkillParams {
  displayName?: string;
  description?: string;
  category?: SkillCategory;
  content?: string;
  filePath?: string;
  applicableAgents?: string[];
  enabled?: boolean;
  tags?: string[];
  version?: string;
  projectId?: string;
}

// Skill 文件扫描结果
export interface ScannedSkillFile {
  name: string;
  filePath: string;
  content: string;
  category: SkillCategory;
  lastModified: Date;
  size: number;
}

// Skill 同步结果
export interface SkillSyncResult {
  added: string[];               // 新增的 Skill IDs
  updated: string[];             // 更新的 Skill IDs
  removed: string[];             // 移除的 Skill IDs
  unchanged: string[];           // 未变动的 Skill IDs
  errors: string[];              // 错误信息
}

// Skill 搜索过滤选项
export interface SkillFilterOptions {
  category?: SkillCategory;
  source?: SkillSource;
  agentId?: string;              // 过滤适用于指定 Agent 的 Skills
  tags?: string[];
  enabled?: boolean;
  searchQuery?: string;
}

// Skill 摘要信息（列表视图用）
export interface SkillSummary {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: SkillCategory;
  source: SkillSource;
  enabled: boolean;
  tags: string[];
  version: string;
  contentLength: number;
  applicableAgentCount: number;
  updatedAt: string;
}

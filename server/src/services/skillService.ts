/**
 * Skill 服务
 * CRUD 操作 + 磁盘文件同步
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { query, queryOne, execute } from '../db/pg.js';
import type {
  SkillDefinition,
  SkillRow,
  SkillCategory,
  CreateSkillParams,
  UpdateSkillParams,
  ScannedSkillFile,
  SkillSyncResult,
  SkillFilterOptions,
  SkillSummary,
} from '../models/skill.js';

/**
 * 获取 Skill 存储目录
 * @returns Skills 目录路径
 */
export function getSkillsDirectory(): string {
  // 优先级：环境变量 > ~/.openclaw/skills > 项目目录
  return (
    process.env.TEAMCLAW_SKILLS_DIR ||
    path.join(os.homedir(), '.openclaw', 'skills')
  );
}

/**
 * 将数据库行转换为 SkillDefinition
 */
function rowToSkill(row: SkillRow): SkillDefinition {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description,
    category: row.category as SkillCategory,
    source: row.source as 'generated' | 'user' | 'imported',
    content: row.content,
    filePath: row.file_path || undefined,
    applicableAgents: JSON.parse(row.applicable_agents || '[]'),
    enabled: row.enabled === 1,
    tags: JSON.parse(row.tags || '[]'),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by || undefined,
    projectId: row.project_id || undefined,
  };
}

/**
 * 生成唯一 ID
 */
function generateId(source: string): string {
  const prefix = source === 'generated' ? 'skill_gen' : 'skill';
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ========== 磁盘扫描 ==========

/**
 * 扫描 Skills 目录，获取所有 Markdown 文件
 * @param dirPath 要扫描的目录
 * @returns 扫描到的 Skill 文件列表
 */
export async function scanSkillFiles(dirPath: string = getSkillsDirectory()): Promise<ScannedSkillFile[]> {
  const skills: ScannedSkillFile[] = [];

  // 如果目录不存在，返回空数组
  if (!fs.existsSync(dirPath)) {
    console.log(`[skillService] Skills directory not found: ${dirPath}`);
    return skills;
  }

  // 遍历目录
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    // 只处理 .md 文件
    if (entry.isFile() && entry.name.endsWith('.md')) {
      const filePath = path.join(dirPath, entry.name);
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');

      // 从文件名和内容推断 category
      const category = inferCategoryFromFile(entry.name, content);

      skills.push({
        name: entry.name.replace('.md', ''),
        filePath,
        content,
        category,
        lastModified: stats.mtime,
        size: stats.size,
      });
    }
  }

  return skills;
}

/**
 * 从文件名和内容推断 Skill 类别
 */
function inferCategoryFromFile(filename: string, content: string): SkillCategory {
  const lowerName = filename.toLowerCase();
  const lowerContent = content.toLowerCase().slice(0, 1000);

  // 基于文件名关键词
  if (lowerName.includes('build') || lowerName.includes('构建')) return 'build';
  if (lowerName.includes('deploy') || lowerName.includes('部署')) return 'deploy';
  if (lowerName.includes('test') || lowerName.includes('测试')) return 'test';
  if (lowerName.includes('structure') || lowerName.includes('目录') || lowerName.includes('结构')) return 'structure';
  if (lowerName.includes('coding') || lowerName.includes('编码') || lowerName.includes('开发')) return 'coding';
  if (lowerName.includes('review') || lowerName.includes('审查') || lowerName.includes('规范')) return 'review';

  // 基于内容关键词
  if (lowerContent.includes('npm run build') || lowerContent.includes('pnpm build')) return 'build';
  if (lowerContent.includes('docker') || lowerContent.includes('deploy')) return 'deploy';
  if (lowerContent.includes('test') || lowerContent.includes('jest') || lowerContent.includes('vitest')) return 'test';
  if (lowerContent.includes('directory structure') || lowerContent.includes('project structure')) return 'structure';
  if (lowerContent.includes('code review') || lowerContent.includes('pr review')) return 'review';

  return 'custom';
}

/**
 * 从 Markdown 内容提取描述
 */
function extractDescriptionFromContent(content: string, maxLength: number = 200): string {
  // 移除 YAML front matter
  const withoutFrontMatter = content.replace(/^---[\s\S]*?---/, '').trim();

  // 提取第一段非标题文本
  const lines = withoutFrontMatter.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      return trimmed.length > maxLength ? trimmed.slice(0, maxLength) + '...' : trimmed;
    }
  }

  return 'No description available';
}

/**
 * 从 Markdown 内容提取标签
 */
function extractTagsFromContent(content: string): string[] {
  const tags: string[] = [];
  const lowerContent = content.toLowerCase();

  // 常见的技术标签
  const techTags: Record<string, string> = {
    react: 'react',
    vue: 'vue',
    angular: 'angular',
    node: 'nodejs',
    python: 'python',
    typescript: 'typescript',
    javascript: 'javascript',
    docker: 'docker',
    kubernetes: 'kubernetes',
    git: 'git',
    github: 'github',
    'ci/cd': 'cicd',
    testing: 'testing',
  };

  for (const [keyword, tag] of Object.entries(techTags)) {
    if (lowerContent.includes(keyword)) {
      tags.push(tag);
    }
  }

  return [...new Set(tags)]; // 去重
}

/**
 * 同步磁盘 Skills 到数据库
 * @returns 同步结果
 */
export async function syncSkillsFromDisk(): Promise<SkillSyncResult> {
  const result: SkillSyncResult = {
    added: [],
    updated: [],
    removed: [],
    unchanged: [],
    errors: [],
  };

  try {
    const skillsDir = getSkillsDirectory();
    const scannedFiles = await scanSkillFiles(skillsDir);

    // 获取数据库中所有 source='generated' 的 Skills
    const dbRows = await query<SkillRow>("SELECT * FROM skills WHERE source = 'generated'");
    const dbSkills = new Map(dbRows.map(row => [row.file_path, row]));

    const processedPaths = new Set<string>();

    for (const file of scannedFiles) {
      const existingRow = dbSkills.get(file.filePath);
      processedPaths.add(file.filePath);

      if (!existingRow) {
        // 新增 Skill
        try {
          const skill = await createSkillFromFile(file, 'system');
          result.added.push(skill.id);
        } catch (err) {
          result.errors.push(`Failed to add skill from ${file.filePath}: ${err}`);
        }
      } else {
        // 检查是否需要更新（比较修改时间）
        const dbUpdatedAt = new Date(existingRow.updated_at);
        if (file.lastModified > dbUpdatedAt) {
          try {
            await updateSkillFromFile(existingRow.id, file);
            result.updated.push(existingRow.id);
          } catch (err) {
            result.errors.push(`Failed to update skill ${existingRow.id}: ${err}`);
          }
        } else {
          result.unchanged.push(existingRow.id);
        }
      }
    }

    // 检查已被删除的文件
    for (const [filePath, row] of dbSkills) {
      if (!processedPaths.has(filePath)) {
        try {
          await deleteSkill(row.id);
          result.removed.push(row.id);
        } catch (err) {
          result.errors.push(`Failed to remove skill ${row.id}: ${err}`);
        }
      }
    }

    console.log(
      `[skillService] Sync complete: ${result.added.length} added, ${result.updated.length} updated, ${result.removed.length} removed, ${result.unchanged.length} unchanged`
    );
  } catch (err) {
    result.errors.push(`Sync failed: ${err}`);
  }

  return result;
}

/**
 * 从文件创建 Skill
 */
async function createSkillFromFile(file: ScannedSkillFile, createdBy: string): Promise<SkillDefinition> {
  const id = generateId('generated');
  const now = new Date().toISOString();
  const displayName = file.name
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  await execute(
    `INSERT INTO skills (
      id, name, display_name, description, category, source, content,
      file_path, applicable_agents, enabled, tags, version,
      created_at, updated_at, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      id,
      file.name,
      displayName,
      extractDescriptionFromContent(file.content),
      file.category,
      'generated',
      file.content,
      file.filePath,
      JSON.stringify([]),
      1, // enabled
      JSON.stringify(extractTagsFromContent(file.content)),
      '1.0.0',
      now,
      now,
      createdBy,
    ]
  );

  const row = await queryOne<SkillRow>('SELECT * FROM skills WHERE id = $1', [id]);
  if (!row) throw new Error('Failed to create skill from file');
  return rowToSkill(row);
}

/**
 * 从文件更新 Skill
 */
async function updateSkillFromFile(id: string, file: ScannedSkillFile): Promise<void> {
  await execute(
    `UPDATE skills SET
      content = $1,
      description = $2,
      category = $3,
      tags = $4,
      updated_at = $5
     WHERE id = $6`,
    [
      file.content,
      extractDescriptionFromContent(file.content),
      file.category,
      JSON.stringify(extractTagsFromContent(file.content)),
      file.lastModified.toISOString(),
      id,
    ]
  );
}

// ========== CRUD 操作 ==========

/**
 * 获取所有 Skills
 * @param options 过滤选项
 * @returns Skill 列表
 */
export async function getAllSkills(options?: SkillFilterOptions): Promise<SkillDefinition[]> {
  let sql = 'SELECT * FROM skills WHERE 1=1';
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (options?.category) {
    sql += ` AND category = $${paramIndex++}`;
    params.push(options.category);
  }

  if (options?.source) {
    sql += ` AND source = $${paramIndex++}`;
    params.push(options.source);
  }

  if (options?.enabled !== undefined) {
    sql += ` AND enabled = $${paramIndex++}`;
    params.push(options.enabled ? 1 : 0);
  }

  if (options?.searchQuery) {
    sql += ` AND (name ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
    params.push(`%${options.searchQuery}%`);
    paramIndex++;
  }

  sql += ' ORDER BY category, display_name';

  const rows = await query<SkillRow>(sql, params);
  let skills = rows.map(rowToSkill);

  // 按 agentId 过滤（如果指定）
  if (options?.agentId) {
    skills = skills.filter(
      s => s.applicableAgents.length === 0 || s.applicableAgents.includes(options.agentId!)
    );
  }

  // 按 tags 过滤（如果指定）
  if (options?.tags?.length) {
    skills = skills.filter(s => options.tags!.some(tag => s.tags.includes(tag)));
  }

  return skills;
}

/**
 * 获取 Skill 摘要列表（轻量级）
 * @returns Skill 摘要列表
 */
export async function getSkillSummaries(): Promise<SkillSummary[]> {
  const rows = await query<SkillRow>(
    'SELECT id, name, display_name, description, category, source, enabled, tags, version, content, applicable_agents, updated_at FROM skills ORDER BY category, display_name'
  );

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description,
    category: row.category as SkillCategory,
    source: row.source as 'generated' | 'user' | 'imported',
    enabled: row.enabled === 1,
    tags: JSON.parse(row.tags || '[]'),
    version: row.version,
    contentLength: row.content?.length || 0,
    applicableAgentCount: JSON.parse(row.applicable_agents || '[]').length,
    updatedAt: row.updated_at,
  }));
}

/**
 * 根据 ID 获取 Skill
 * @param id Skill ID
 * @returns Skill 定义，不存在返回 null
 */
export async function getSkillById(id: string): Promise<SkillDefinition | null> {
  const row = await queryOne<SkillRow>('SELECT * FROM skills WHERE id = $1', [id]);
  return row ? rowToSkill(row) : null;
}

/**
 * 根据名称获取 Skill
 * @param name Skill 名称
 * @returns Skill 定义，不存在返回 null
 */
export async function getSkillByName(name: string): Promise<SkillDefinition | null> {
  const row = await queryOne<SkillRow>('SELECT * FROM skills WHERE name = $1', [name]);
  return row ? rowToSkill(row) : null;
}

/**
 * 创建 Skill
 * @param params 创建参数
 * @param createdBy 创建者 ID
 * @returns 新创建的 Skill
 */
export async function createSkill(
  params: CreateSkillParams,
  createdBy: string
): Promise<SkillDefinition> {
  // 检查名称是否已存在
  const existing = await getSkillByName(params.name);
  if (existing) {
    throw new Error(`Skill with name '${params.name}' already exists`);
  }

  const id = generateId('user');
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO skills (
      id, name, display_name, description, category, source, content,
      file_path, applicable_agents, enabled, tags, version,
      created_at, updated_at, created_by, project_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      id,
      params.name,
      params.displayName,
      params.description,
      params.category,
      'user',
      params.content,
      params.filePath || null,
      JSON.stringify(params.applicableAgents || []),
      1, // enabled
      JSON.stringify(params.tags || []),
      params.version || '1.0.0',
      now,
      now,
      createdBy,
      params.projectId || null,
    ]
  );

  const created = await getSkillById(id);
  if (!created) {
    throw new Error('Failed to create skill');
  }
  return created;
}

/**
 * 更新 Skill
 * @param id Skill ID
 * @param params 更新参数
 * @returns 更新后的 Skill，不存在返回 null
 */
export async function updateSkill(
  id: string,
  params: UpdateSkillParams
): Promise<SkillDefinition | null> {
  // 检查 Skill 是否存在
  const existing = await queryOne<SkillRow>('SELECT * FROM skills WHERE id = $1', [id]);
  if (!existing) return null;

  // generated 类型的 Skill 不允许修改某些字段（磁盘同步管理）
  if (existing.source === 'generated' && params.content !== undefined) {
    console.warn(`[skillService] Modifying generated skill content is not recommended: ${id}`);
  }

  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (params.displayName !== undefined) {
    updates.push(`display_name = $${paramIndex++}`);
    values.push(params.displayName);
  }

  if (params.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(params.description);
  }

  if (params.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(params.category);
  }

  if (params.content !== undefined) {
    updates.push(`content = $${paramIndex++}`);
    values.push(params.content);
  }

  if (params.filePath !== undefined) {
    updates.push(`file_path = $${paramIndex++}`);
    values.push(params.filePath || null);
  }

  if (params.applicableAgents !== undefined) {
    updates.push(`applicable_agents = $${paramIndex++}`);
    values.push(JSON.stringify(params.applicableAgents));
  }

  if (params.enabled !== undefined) {
    updates.push(`enabled = $${paramIndex++}`);
    values.push(params.enabled ? 1 : 0);
  }

  if (params.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    values.push(JSON.stringify(params.tags));
  }

  if (params.version !== undefined) {
    updates.push(`version = $${paramIndex++}`);
    values.push(params.version);
  }

  if (params.projectId !== undefined) {
    updates.push(`project_id = $${paramIndex++}`);
    values.push(params.projectId || null);
  }

  // 始终更新 updated_at
  updates.push(`updated_at = $${paramIndex++}`);
  values.push(new Date().toISOString());

  // 添加 ID 作为最后一个参数
  values.push(id);

  await execute(`UPDATE skills SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);

  return getSkillById(id);
}

/**
 * 删除 Skill
 * @param id Skill ID
 * @returns 是否删除成功
 */
export async function deleteSkill(id: string): Promise<boolean> {
  const affectedRows = await execute('DELETE FROM skills WHERE id = $1', [id]);
  return affectedRows > 0;
}

/**
 * 切换 Skill 启用状态
 * @param id Skill ID
 * @param enabled 是否启用
 * @returns 更新后的 Skill，不存在返回 null
 */
export async function toggleSkillEnabled(id: string, enabled: boolean): Promise<SkillDefinition | null> {
  return updateSkill(id, { enabled });
}

// ========== Agent 相关 ==========

/**
 * 获取适用于指定 Agent 的 Skills
 * @param agentId Agent ID
 * @returns Skill 列表
 */
export async function getSkillsForAgent(agentId: string): Promise<SkillDefinition[]> {
  const all = await getAllSkills({ enabled: true });
  return all.filter(
    s => s.applicableAgents.length === 0 || s.applicableAgents.includes(agentId)
  );
}

/**
 * 获取启用 Skills 的完整内容（用于构建 System Prompt）
 * @param agentId Agent ID
 * @returns 组合后的 Markdown 内容
 */
export async function getCombinedSkillContentForAgent(agentId: string): Promise<string> {
  const skills = await getSkillsForAgent(agentId);

  if (skills.length === 0) {
    return '';
  }

  const sections: string[] = ['# Agent Skills\n'];

  for (const skill of skills) {
    sections.push(`## ${skill.displayName}\n`);
    if (skill.description) {
      sections.push(`${skill.description}\n`);
    }
    sections.push(skill.content);
    sections.push('\n---\n');
  }

  return sections.join('\n');
}

// ========== 统计 ==========

/**
 * 获取 Skill 统计信息
 * @returns 统计数据
 */
export async function getSkillStats(): Promise<{
  total: number;
  byCategory: Record<SkillCategory, number>;
  bySource: Record<string, number>;
  enabled: number;
  disabled: number;
}> {
  const rows = await query<{ category: string; source: string; enabled: number; count: string }>(
    'SELECT category, source, enabled, COUNT(*) as count FROM skills GROUP BY category, source, enabled'
  );

  const stats = {
    total: 0,
    byCategory: {
      build: 0,
      deploy: 0,
      test: 0,
      structure: 0,
      coding: 0,
      review: 0,
      custom: 0,
    },
    bySource: {},
    enabled: 0,
    disabled: 0,
  };

  for (const row of rows) {
    const count = parseInt(row.count, 10);
    stats.total += count;

    if (stats.byCategory[row.category as SkillCategory] !== undefined) {
      stats.byCategory[row.category as SkillCategory] += count;
    }

    stats.bySource[row.source] = (stats.bySource[row.source] || 0) + count;

    if (row.enabled === 1) {
      stats.enabled += count;
    } else {
      stats.disabled += count;
    }
  }

  return stats;
}

// ========== 导出 ==========

export const skillService = {
  // 扫描同步
  getSkillsDirectory,
  scanSkillFiles,
  syncSkillsFromDisk,

  // CRUD
  getAllSkills,
  getSkillSummaries,
  getSkillById,
  getSkillByName,
  createSkill,
  updateSkill,
  deleteSkill,
  toggleSkillEnabled,

  // Agent 相关
  getSkillsForAgent,
  getCombinedSkillContentForAgent,

  // 统计
  getSkillStats,
};

export default skillService;

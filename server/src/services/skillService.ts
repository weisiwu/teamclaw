// Skill CRUD + 磁盘同步服务
// 扫描 ~/.openclaw/skills/ 目录同步 Skills

import * as fs from 'fs';
import * as path from 'path';
import { SkillDefinition, SkillCategory, SkillSource } from '../models/skill.js';

const SKILLS_DISK_DIR = path.join(process.env.HOME || '/root', '.openclaw', 'skills');
const DATA_DIR = path.join(process.cwd(), 'data');
const PERSIST_FILE = path.join(DATA_DIR, 'skills.json');

// ========== 持久化 ==========
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function persistSkills() {
  try {
    ensureDataDir();
    const data = Array.from(skills.values()).map(s => [s.id, s] as [string, SkillDefinition]);
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(data), 'utf-8');
  } catch {
    // Ignore persistence errors
  }
}

function loadSkills() {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const data = JSON.parse(fs.readFileSync(PERSIST_FILE, 'utf-8')) as [string, SkillDefinition][];
      for (const [id, skill] of data) {
        skills.set(id, skill);
      }
    }
  } catch {
    // Start fresh on error
  }
}

// ========== 内存存储 ==========
const skills: Map<string, SkillDefinition> = new Map();

// ========== 磁盘同步 ==========

// 判断文件是否为 Markdown
function isMarkdown(filename: string): boolean {
  return filename.endsWith('.md') || filename.endsWith('.markdown');
}

// 从磁盘扫描所有 Skills 并同步到内存
function syncFromDisk(): SkillDefinition[] {
  const now = new Date().toISOString();
  const synced: SkillDefinition[] = [];

  if (!fs.existsSync(SKILLS_DISK_DIR)) {
    return synced;
  }

  function scanDir(dir: string, baseName = ''): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, entry.name);
      } else if (entry.isFile() && isMarkdown(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const skillId = `skill.${baseName ? baseName + '.' : ''}${path.basename(entry.name, path.extname(entry.name))}`;
          const category = inferCategory(fullPath);
          const skill: SkillDefinition = {
            id: skillId,
            name: path.basename(entry.name, path.extname(entry.name)),
            displayName: extractDisplayName(content) || path.basename(entry.name, path.extname(entry.name)),
            description: extractDescription(content) || `磁盘文件: ${fullPath}`,
            category,
            source: 'generated',
            content,
            filePath: fullPath,
            applicableAgents: [],
            enabled: true,
            tags: [],
            version: '1.0.0',
            createdAt: now,
            updatedAt: now,
          };

          // 如果已存在且内容未变，保留原有 createdAt
          const existing = skills.get(skillId);
          if (existing && existing.filePath === fullPath) {
            skills.set(skillId, { ...skill, createdAt: existing.createdAt });
          } else {
            skills.set(skillId, skill);
          }
          synced.push(skill);
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  scanDir(SKILLS_DISK_DIR);
  return synced;
}

// 根据路径推断分类
function inferCategory(filePath: string): SkillCategory {
  const lower = filePath.toLowerCase();
  if (lower.includes('build')) return 'build';
  if (lower.includes('deploy')) return 'deploy';
  if (lower.includes('test')) return 'test';
  if (lower.includes('structure')) return 'structure';
  if (lower.includes('code') || lower.includes('coding')) return 'coding';
  if (lower.includes('review')) return 'review';
  return 'custom';
}

// 从 Markdown 内容提取标题作为 displayName
function extractDisplayName(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

// 从 Markdown 内容提取第一段描述
function extractDescription(content: string): string | null {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```')) {
      return trimmed.slice(0, 200);
    }
  }
  return null;
}

// ========== CRUD 操作 ==========

// 获取所有 Skills
function getSkills(): SkillDefinition[] {
  return Array.from(skills.values());
}

// 获取单个 Skill
function getSkill(id: string): SkillDefinition | undefined {
  return skills.get(id);
}

// 按分类筛选
function getSkillsByCategory(category: SkillCategory): SkillDefinition[] {
  return Array.from(skills.values()).filter(s => s.category === category);
}

// 按来源筛选
function getSkillsBySource(source: SkillSource): SkillDefinition[] {
  return Array.from(skills.values()).filter(s => s.source === source);
}

// 搜索 Skills
function searchSkills(query: string): SkillDefinition[] {
  const q = query.toLowerCase();
  return Array.from(skills.values()).filter(
    s =>
      s.name.toLowerCase().includes(q) ||
      s.displayName.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some(tag => tag.toLowerCase().includes(q))
  );
}

// 创建 Skill
function createSkill(
  data: Omit<SkillDefinition, 'id' | 'createdAt' | 'updatedAt'>
): SkillDefinition {
  const now = new Date().toISOString();
  const skill: SkillDefinition = {
    ...data,
    id: `skill.${data.name.replace(/\s+/g, '.')}.${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  skills.set(skill.id, skill);
  persistSkills();
  return skill;
}

// 更新 Skill
function updateSkill(id: string, updates: Partial<SkillDefinition>): SkillDefinition | null {
  const skill = skills.get(id);
  if (!skill) return null;
  const updated: SkillDefinition = {
    ...skill,
    ...updates,
    id: skill.id,
    createdAt: skill.createdAt,
    updatedAt: new Date().toISOString(),
  };
  skills.set(id, updated);
  persistSkills();
  return updated;
}

// 删除 Skill（仅允许删除 user 类型）
function deleteSkill(id: string): boolean {
  const skill = skills.get(id);
  if (!skill) return false;
  if (skill.source === 'generated' && skill.filePath) return false; // 磁盘来源不可直接删除
  skills.delete(id);
  persistSkills();
  return true;
}

// 切换启用状态
function toggleSkill(id: string, enabled: boolean): SkillDefinition | null {
  return updateSkill(id, { enabled });
}

// 强制从磁盘同步（会覆盖磁盘来源的 skills）
function forceSyncFromDisk(): { synced: number; total: number } {
  syncFromDisk();
  persistSkills();
  const total = skills.size;
  const synced = Array.from(skills.values()).filter(s => s.source === 'generated').length;
  return { synced, total };
}

// 获取同步统计
function getSyncStats(): { diskDir: string; exists: boolean; skillsFromDisk: number; totalSkills: number } {
  const diskSkills = Array.from(skills.values()).filter(s => s.source === 'generated').length;
  return {
    diskDir: SKILLS_DISK_DIR,
    exists: fs.existsSync(SKILLS_DISK_DIR),
    skillsFromDisk: diskSkills,
    totalSkills: skills.size,
  };
}

// 初始化：从磁盘同步 + 加载持久化数据
function init() {
  // 先从磁盘扫描，同步磁盘上的 skills
  syncFromDisk();
  // 再加载本地持久化（内存中已存在的会被跳过或更新）
  loadSkills();
}

init();

export const skillService = {
  getSkills,
  getSkill,
  getSkillsByCategory,
  getSkillsBySource,
  searchSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  toggleSkill,
  forceSyncFromDisk,
  getSyncStats,
};

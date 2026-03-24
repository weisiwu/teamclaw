import { Ability, DEFAULT_ABILITIES } from '../models/ability.js';
import * as fs from 'fs';
import * as path from 'path';

// ========== 持久化 ==========
const DATA_DIR = path.join(process.cwd(), 'data');
const PERSIST_FILE = path.join(DATA_DIR, 'abilities.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function persistAbilities() {
  try {
    ensureDataDir();
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(Array.from(abilities.entries())), 'utf-8');
  } catch {
    // Ignore
  }
}

function loadAbilities() {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const data = JSON.parse(fs.readFileSync(PERSIST_FILE, 'utf-8')) as [string, Ability][];
      for (const [id, ability] of data) {
        abilities.set(id, ability);
      }
    }
  } catch {
    // Start with defaults
  }
}

// ========== 内存存储 ==========
const abilities: Map<string, Ability> = new Map();

// 初始化默认能力
function initAbilities() {
  const now = new Date().toISOString();
  for (const def of DEFAULT_ABILITIES) {
    abilities.set(def.id, {
      ...def,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// 获取所有能力
function getAbilities(): Ability[] {
  return Array.from(abilities.values());
}

// 获取单个能力
function getAbility(id: string): Ability | undefined {
  return abilities.get(id);
}

// 更新能力状态（持久化到磁盘）
function updateAbility(id: string, enabled: boolean): Ability | null {
  const ability = abilities.get(id);
  if (!ability) return null;
  ability.enabled = enabled;
  ability.updatedAt = new Date().toISOString();
  persistAbilities();
  return ability;
}

// 重置所有能力到默认状态
function resetAbilities(): void {
  abilities.clear();
  initAbilities();
  persistAbilities();
}

// 检查用户是否有权使用某能力
function canUseAbility(abilityId: string, userRole: string): boolean {
  const ability = abilities.get(abilityId);
  if (!ability) return false;
  if (!ability.enabled) return false;
  if (ability.requiredRole === 'all') return true;
  if (ability.requiredRole === 'admin') return userRole === 'admin';
  if (ability.requiredRole === 'sub_admin') return userRole === 'admin' || userRole === 'sub_admin';
  return false;
}

// 初始化
initAbilities();
loadAbilities();

export const abilityService = {
  getAbilities,
  getAbility,
  updateAbility,
  resetAbilities,
  canUseAbility,
};

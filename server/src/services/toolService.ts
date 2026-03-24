// Tool CRUD + 注册服务（内存存储 + JSON 文件持久化）

import * as fs from 'fs';
import * as path from 'path';
import {
  ToolDefinition,
  BUILTIN_TOOLS,
  ToolCategory,
  ToolSource,
  RiskLevel,
} from '../models/tool.js';

// ========== 持久化 ==========
const DATA_DIR = path.join(process.cwd(), 'data');
const PERSIST_FILE = path.join(DATA_DIR, 'tools.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function persistTools() {
  try {
    ensureDataDir();
    const data = Array.from(tools.values()).map(t => [t.id, t] as [string, ToolDefinition]);
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(data), 'utf-8');
  } catch {
    // Ignore persistence errors
  }
}

function loadTools() {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const data = JSON.parse(fs.readFileSync(PERSIST_FILE, 'utf-8')) as [string, ToolDefinition][];
      for (const [id, tool] of data) {
        tools.set(id, tool);
      }
    }
  } catch {
    // Start with builtins on error
  }
}

// ========== 内存存储 ==========
const tools: Map<string, ToolDefinition> = new Map();

// 初始化内置工具
function initBuiltinTools() {
  const now = new Date().toISOString();
  for (const def of BUILTIN_TOOLS) {
    tools.set(def.id, {
      ...def,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// 获取所有工具
function getTools(): ToolDefinition[] {
  return Array.from(tools.values());
}

// 获取单个工具
function getTool(id: string): ToolDefinition | undefined {
  return tools.get(id);
}

// 按分类筛选工具
function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return Array.from(tools.values()).filter(t => t.category === category);
}

// 按来源筛选工具
function getToolsBySource(source: ToolSource): ToolDefinition[] {
  return Array.from(tools.values()).filter(t => t.source === source);
}

// 搜索工具
function searchTools(query: string): ToolDefinition[] {
  const q = query.toLowerCase();
  return Array.from(tools.values()).filter(
    t =>
      t.name.toLowerCase().includes(q) ||
      t.displayName.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
  );
}

// 创建工具（仅 user/imported 类型）
function createTool(
  data: Omit<ToolDefinition, 'id' | 'createdAt' | 'updatedAt'>
): ToolDefinition {
  const now = new Date().toISOString();
  const tool: ToolDefinition = {
    ...data,
    id: `tool.${data.name.replace(/\s+/g, '.')}.${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  tools.set(tool.id, tool);
  persistTools();
  return tool;
}

// 更新工具
function updateTool(id: string, updates: Partial<ToolDefinition>): ToolDefinition | null {
  const tool = tools.get(id);
  if (!tool) return null;
  const updated: ToolDefinition = {
    ...tool,
    ...updates,
    id: tool.id, // 禁止修改 id
    createdAt: tool.createdAt, // 禁止修改 createdAt
    updatedAt: new Date().toISOString(),
  };
  tools.set(id, updated);
  persistTools();
  return updated;
}

// 删除工具（仅允许删除 user/imported 类型）
function deleteTool(id: string): boolean {
  const tool = tools.get(id);
  if (!tool) return false;
  if (tool.source === 'builtin') return false; // 内置工具不可删除
  tools.delete(id);
  persistTools();
  return true;
}

// 切换工具启用状态
function toggleTool(id: string, enabled: boolean): ToolDefinition | null {
  return updateTool(id, { enabled });
}

// 注册/更新工具（用于导入）
function registerTool(tool: ToolDefinition): ToolDefinition {
  const existing = tools.get(tool.id);
  if (existing) {
    // 更新已有工具
    return updateTool(tool.id, tool) ?? tool;
  }
  const now = new Date().toISOString();
  const newTool: ToolDefinition = {
    ...tool,
    createdAt: now,
    updatedAt: now,
  };
  tools.set(newTool.id, newTool);
  persistTools();
  return newTool;
}

// 初始化
initBuiltinTools();
loadTools();

export const toolService = {
  getTools,
  getTool,
  getToolsByCategory,
  getToolsBySource,
  searchTools,
  createTool,
  updateTool,
  deleteTool,
  toggleTool,
  registerTool,
};

/**
 * codeAnalyzer.ts — 代码架构分析服务
 * 分析模块划分、依赖关系、入口文件
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ModuleInfo {
  name: string;
  path: string;
  type: 'dir' | 'file';
  children?: ModuleInfo[];
  entryFiles: string[];
  dependencies: string[];
  description?: string;
}

export interface CodeArchitecture {
  root: string;
  modules: ModuleInfo[];
  entryPoints: string[];
  packageJson?: Record<string, unknown>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export async function analyzeCodeArchitecture(projectPath: string): Promise<CodeArchitecture> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  let packageJson: Record<string, unknown> | undefined;
  let dependencies: Record<string, string> = {};
  let devDependencies: Record<string, string> = {};

  if (fs.existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const pkg = packageJson as Record<string, Record<string, string>>;
      dependencies = pkg.dependencies || {};
      devDependencies = pkg.devDependencies || {};
    } catch {
      // ignore parse errors
    }
  }

  const entryPoints = findEntryPoints(projectPath);
  const modules = buildModuleTree(projectPath);

  return {
    root: projectPath,
    modules,
    entryPoints,
    packageJson,
    dependencies,
    devDependencies,
  };
}

function findEntryPoints(projectPath: string): string[] {
  const entries: string[] = [];
  const patterns = [
    'index.ts', 'index.tsx', 'index.js', 'index.jsx',
    'main.ts', 'main.tsx', 'main.js', 'app.ts', 'app.tsx',
    'src/index.ts', 'src/index.tsx', 'src/main.ts',
    'server.ts', 'server/index.ts', 'api/index.ts',
  ];

  function search(dir: string): boolean {
    const entries_list = fs.readdirSync(dir);
    for (const pattern of patterns) {
      if (entries_list.includes(pattern)) {
        entries.push(path.join(dir, pattern));
        return true;
      }
    }
    // 递归搜索子目录（最多2层）
    const subDirs = entries_list
      .filter(name => {
        const full = path.join(dir, name);
        return fs.statSync(full).isDirectory() &&
          !['node_modules', '.git', 'dist', 'build', '__pycache__'].includes(name);
      })
      .slice(0, 5); // 最多5个子目录

    for (const sub of subDirs) {
      search(path.join(dir, sub));
    }
    return false;
  }

  search(projectPath);
  return [...new Set(entries)]; // 去重
}

function buildModuleTree(dir: string): ModuleInfo[] {
  const modules: ModuleInfo[] = [];
  let entries: fs.Dirent[] = [];

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return modules;
  }

  const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.venv', 'vendor', '.svn', 'coverage']);

  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const children = buildModuleTree(fullPath);

    // 找入口文件
    const entryFiles = findLocalEntryFiles(fullPath);

    // 推测依赖（基于 package.json 或目录名）
    const dependencies = inferDependencies(fullPath);

    modules.push({
      name: entry.name,
      path: fullPath,
      type: 'dir',
      children: children.length > 0 ? children : undefined,
      entryFiles,
      dependencies,
    });
  }

  return modules;
}

function findLocalEntryFiles(dir: string): string[] {
  const ENTRY_NAMES = ['index', 'main', 'app', 'server', 'api', 'routes', 'config'];
  const entries = fs.readdirSync(dir);
  return entries
    .filter(name => {
      const base = name.replace(/\.(ts|tsx|js|jsx)$/, '');
      return ENTRY_NAMES.includes(base) && /\.(ts|tsx|js|jsx)$/.test(name);
    })
    .map(name => path.join(dir, name));
}

function inferDependencies(dir: string): string[] {
  const deps: string[] = [];

  // 检查 package.json
  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { dependencies?: Record<string, string> };
      if (pkg.dependencies) {
        deps.push(...Object.keys(pkg.dependencies));
      }
    } catch {
      // ignore
    }
  }

  return [...new Set(deps)];
}

export function summarizeArchitecture(arch: CodeArchitecture): string {
  const lines: string[] = [];
  lines.push(`项目根目录: ${arch.root}`);
  lines.push(`入口文件: ${arch.entryPoints.length > 0 ? arch.entryPoints.join(', ') : '未找到'}`);
  lines.push(`顶层模块 (${arch.modules.length}):`);
  for (const mod of arch.modules) {
    lines.push(`  - ${mod.name}/`);
    if (mod.children && mod.children.length > 0) {
      for (const child of mod.children.slice(0, 3)) {
        lines.push(`    └─ ${child.name}/`);
      }
      if (mod.children.length > 3) lines.push(`    └─ ... (${mod.children.length - 3} more)`);
    }
  }
  return lines.join('\n');
}

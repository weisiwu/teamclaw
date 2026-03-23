/**
 * buildDetector.ts — 打包/编译机制检测服务
 * Step 5 of 13-step import: 检测项目使用的打包/编译机制
 */

import fs from 'fs/promises';
import path from 'path';

// ---------------------------------------------------------------------------
// Interface definitions
// ---------------------------------------------------------------------------

export interface BuildScripts {
  dev?: string;
  build?: string;
  start?: string;
  test?: string;
  lint?: string;
  typeCheck?: string;
}

export interface BuildOutput {
  outputDir: string;
  format?: string;
  hasSourceMap?: boolean;
}

export interface BuildMechanism {
  bundler: string;
  bundlerVersion?: string;
  configFile?: string;
  scripts: BuildScripts;
  output: BuildOutput;
  features: string[];
  monorepo?: boolean;
  monorepoTool?: string;
}

// ---------------------------------------------------------------------------
// Bundler config file map
// ---------------------------------------------------------------------------

interface BundlerDef {
  file: string;
  bundler: string;
  defaultOutputDir: string;
}

const BUNDLER_CONFIGS: BundlerDef[] = [
  { file: 'vite.config.ts', bundler: 'Vite', defaultOutputDir: 'dist' },
  { file: 'vite.config.js', bundler: 'Vite', defaultOutputDir: 'dist' },
  { file: 'vite.config.mjs', bundler: 'Vite', defaultOutputDir: 'dist' },
  { file: 'webpack.config.js', bundler: 'Webpack', defaultOutputDir: 'dist' },
  { file: 'webpack.config.ts', bundler: 'Webpack', defaultOutputDir: 'dist' },
  { file: 'rollup.config.js', bundler: 'Rollup', defaultOutputDir: 'dist' },
  { file: 'rollup.config.ts', bundler: 'Rollup', defaultOutputDir: 'dist' },
  { file: 'esbuild.config.js', bundler: 'esbuild', defaultOutputDir: 'dist' },
  { file: 'parcel.config.js', bundler: 'Parcel', defaultOutputDir: 'dist' },
  { file: 'next.config.js', bundler: 'Next.js', defaultOutputDir: '.next' },
  { file: 'next.config.mjs', bundler: 'Next.js', defaultOutputDir: '.next' },
  { file: 'next.config.ts', bundler: 'Next.js', defaultOutputDir: '.next' },
  { file: 'nuxt.config.ts', bundler: 'Nuxt', defaultOutputDir: '.output' },
  { file: 'svelte.config.js', bundler: 'SvelteKit', defaultOutputDir: 'build' },
  { file: 'rspack.config.js', bundler: 'Rspack', defaultOutputDir: 'dist' },
];

const MONOREPO_FILES: Record<string, string> = {
  'lerna.json': 'Lerna',
  'turbo.json': 'Turborepo',
  'pnpm-workspace.yaml': 'pnpm',
  'rush.json': 'Rush',
  'bolt.json': 'Bolt',
};

const SOURCEMAP_PATTERNS = [
  'sourceMap',
  'sourcemap',
  'devtool',
  'inlineSourceMap',
  'source-map',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fileExists(dir: string, filename: string): Promise<boolean> {
  try {
    await fs.access(path.join(dir, filename));
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T = unknown>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function extractOutputFromConfig(content: string, bundler: string): string | null {
  const lines = content.split('\n');
  for (const line of lines) {
    // Match common output dir patterns
    const patterns = [
      /output:\s*['"`]([^'"`]+)['"`]/,
      /outDir:\s*['"`]([^'"`]+)['"`]/,
      /distDir:\s*['"`]([^'"`]+)['"`]/,
      /buildDir:\s*['"`]([^'"`]+)['"`]/,
      /path:\s*['"`]([^'"`]+)['"`]/,
    ];
    for (const pat of patterns) {
      const m = line.match(pat);
      if (m) return m[1];
    }
  }
  return null;
}

function inferFeatures(bundler: string, configContent: string | null): string[] {
  const features: string[] = [];

  if (bundler === 'Next.js') {
    features.push('SSR', 'SSG', 'API Routes');
    if (configContent?.includes('experimental.appDir')) features.push('App Router');
    if (configContent?.includes('turbo')) features.push('Turbopack');
  }
  if (bundler === 'Nuxt') {
    features.push('SSR', 'SSG', 'Auto-imports');
  }
  if (bundler === 'Vite') {
    features.push('HMR', 'ESM', 'Fast Refresh');
    if (configContent?.includes('react()')) features.push('React Fast Refresh');
  }
  if (bundler === 'Webpack') {
    features.push('Code Splitting', 'Tree Shaking');
    if (configContent?.includes('HotModuleReplacementPlugin')) features.push('HMR');
    if (configContent?.includes('splitChunks')) features.push('Code Splitting');
  }
  if (bundler === 'Rollup') {
    features.push('Tree Shaking', 'Code Splitting');
  }
  if (bundler === 'SvelteKit') {
    features.push('SSR', 'SSG', 'File-based Routing');
  }

  return features;
}

function hasSourceMap(content: string | null): boolean {
  if (!content) return false;
  return SOURCEMAP_PATTERNS.some(p => content.toLowerCase().includes(p));
}

function extractFormat(content: string | null): string | undefined {
  if (!content) return undefined;
  if (content.includes('format: [') || content.includes('"format":')) {
    if (content.includes('esm') || content.includes('module')) return 'esm';
    if (content.includes('cjs') || content.includes('commonjs')) return 'cjs';
    if (content.includes('umd')) return 'umd';
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Main detection function
// ---------------------------------------------------------------------------

/**
 * Detect the build/packaging mechanism for a project at projectPath.
 * Returns a single BuildMechanism describing the primary bundler detected.
 */
export async function detectBuildMechanism(projectPath: string): Promise<BuildMechanism[]> {
  const result: BuildMechanism[] = [];

  let entries: string[] = [];
  try {
    entries = await fs.readdir(projectPath);
  } catch {
    return result;
  }

  const entrySet = new Set(entries);

  // -------------------------------------------------------------------------
  // 1. Package.json: scripts + version + monorepo workspaces
  // -------------------------------------------------------------------------
  const pkgScripts: BuildScripts = {};
  let bundlerVersion: string | undefined;
  let monorepo = false;
  let monorepoTool: string | undefined;

  if (entrySet.has('package.json')) {
    const pkg = await readJsonFile<Record<string, unknown>>(path.join(projectPath, 'package.json'));
    if (pkg && typeof pkg === 'object') {
      const scripts = pkg.scripts as Record<string, string> | undefined;
      if (scripts) {
        pkgScripts.dev = scripts['dev'];
        pkgScripts.build = scripts['build'];
        pkgScripts.start = scripts['start'];
        pkgScripts.test = scripts['test'];
        pkgScripts.lint = scripts['lint'];
        pkgScripts.typeCheck = scripts['typecheck'] ?? scripts['type-check'] ?? scripts['types'];
      }

      // Extract bundler version from devDependencies
      const devDeps = pkg['devDependencies'] as Record<string, string> | undefined;
      const deps = { ...devDeps, ...(pkg['dependencies'] as Record<string, string> | undefined) };

      const bundlerDeps = [
        'vite', 'webpack', 'rollup', 'esbuild', 'parcel',
        'next', 'nuxt', '@sveltejs/kit', '@rspack/core',
      ];
      for (const dep of bundlerDeps) {
        if (deps[dep]) {
          bundlerVersion = deps[dep].replace(/[\^~>=<]/g, '');
          break;
        }
      }

      // Monorepo check via workspaces
      const workspaces = pkg['workspaces'];
      if (workspaces) {
        monorepo = true;
        monorepoTool = 'npm/pnpm workspaces';
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. Monorepo tool files
  // -------------------------------------------------------------------------
  for (const [file, tool] of Object.entries(MONOREPO_FILES)) {
    if (entrySet.has(file)) {
      monorepo = true;
      monorepoTool = tool;
      break;
    }
  }

  // -------------------------------------------------------------------------
  // 3. Detect bundler from config files
  // -------------------------------------------------------------------------
  let detectedBundler = '';
  let configFile = '';
  let defaultOutputDir = 'dist';

  for (const def of BUNDLER_CONFIGS) {
    if (entrySet.has(def.file)) {
      detectedBundler = def.bundler;
      configFile = def.file;
      defaultOutputDir = def.defaultOutputDir;
      break;
    }
  }

  // Fallback: detect from package.json + tsconfig.json
  if (!detectedBundler) {
    if (entrySet.has('tsconfig.json') && entrySet.has('package.json')) {
      const pkg = await readJsonFile<Record<string, unknown>>(path.join(projectPath, 'package.json'));
      const scripts = pkg?.['scripts'] as Record<string, string> | undefined;
      // If build script uses tsc directly
      if (scripts?.['build']?.includes('tsc')) {
        detectedBundler = 'tsc';
        defaultOutputDir = 'dist';
      }
    }
    if (entrySet.has('Cargo.toml')) {
      detectedBundler = 'Cargo';
      defaultOutputDir = 'target';
    }
    if (entrySet.has('go.mod')) {
      detectedBundler = 'Go modules';
      defaultOutputDir = '';
    }
    if (entrySet.has('Makefile')) {
      detectedBundler = 'Make';
      defaultOutputDir = '';
    }
    if (entrySet.has('CMakeLists.txt')) {
      detectedBundler = 'CMake';
      defaultOutputDir = 'build';
    }
    if (entrySet.has('pom.xml')) {
      detectedBundler = 'Maven';
      defaultOutputDir = 'target';
    }
    if (entrySet.has('build.gradle') || entrySet.has('build.gradle.kts')) {
      detectedBundler = 'Gradle';
      defaultOutputDir = 'build';
    }
    if (entrySet.has('pyproject.toml') || entrySet.has('setup.py')) {
      detectedBundler = 'Python build';
      defaultOutputDir = 'dist';
    }
  }

  // -------------------------------------------------------------------------
  // 4. Parse config file for output dir / source map / format
  // -------------------------------------------------------------------------
  let outputDir = defaultOutputDir;
  let hasSourceMap = false;
  let format: string | undefined;

  if (configFile) {
    const configPath = path.join(projectPath, configFile);
    const configContent = await readTextFile(configPath);

    const inferredDir = extractOutputFromConfig(configContent ?? '', detectedBundler);
    if (inferredDir) outputDir = inferredDir;

    hasSourceMap = hasSourceMap(configContent);
    format = extractFormat(configContent);
  }

  // -------------------------------------------------------------------------
  // 5. Infer features
  // -------------------------------------------------------------------------
  const configContent = configFile
    ? await readTextFile(path.join(projectPath, configFile))
    : null;
  const features = inferFeatures(detectedBundler, configContent);

  // -------------------------------------------------------------------------
  // 6. Build result (only if a bundler was detected)
  // -------------------------------------------------------------------------
  if (detectedBundler) {
    result.push({
      bundler: detectedBundler,
      bundlerVersion,
      configFile: configFile || undefined,
      scripts: pkgScripts,
      output: {
        outputDir,
        format,
        hasSourceMap,
      },
      features,
      monorepo: monorepo || undefined,
      monorepoTool: monorepoTool || undefined,
    });
  }

  return result;
}

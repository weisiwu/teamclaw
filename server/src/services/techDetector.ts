import fs from 'fs/promises';
import path from 'path';

export interface TechStack {
  framework: string[];
  language: string[];
  buildTool: string[];
  orm: string[];
  uiFramework: string[];
  runtime: string[];
  fullStack: string[];
}

const FRAMEWORKS: Record<string, string[]> = {
  'package.json': ['Node.js'],
  'Cargo.toml': ['Rust'],
  'go.mod': ['Go'],
  'requirements.txt': ['Python'],
  'Pipfile': ['Python'],
  'pyproject.toml': ['Python'],
  'pom.xml': ['Java'],
  'build.gradle': ['Java', 'Kotlin'],
  'Cargo.toml': ['Rust'],
  'Caddyfile': ['Caddy'],
  'docker-compose.yml': ['Docker'],
  'Dockerfile': ['Docker'],
  'Makefile': ['Make'],
  'CMakeLists.txt': ['CMake'],
};

const LANGUAGES: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript/React',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript/React',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.swift': 'Swift',
  '.dart': 'Dart',
  '.cs': 'C#',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.c': 'C',
  '.cpp': 'C++',
  '.h': 'C/C++',
  '.hpp': 'C++',
};

const BUILD_TOOLS: Record<string, string> = {
  'package.json': 'npm/yarn/pnpm',
  'Cargo.toml': 'Cargo',
  'go.mod': 'Go modules',
  'requirements.txt': 'pip',
  'Pipfile': 'Pipenv',
  'pyproject.toml': 'Poetry',
  'pom.xml': 'Maven',
  'build.gradle': 'Gradle',
  'CMakeLists.txt': 'CMake',
  'Makefile': 'Make',
  'Cargo.toml': 'Cargo',
};

const UI_FRAMEWORKS: Record<string, string> = {
  'next.config.js': 'Next.js',
  'nuxt.config.ts': 'Nuxt.js',
  'gatsby-config.js': 'Gatsby',
  'vue.config.js': 'Vue CLI',
  'angular.json': 'Angular',
  'App.tsx': 'React',
  'App.jsx': 'React',
  'App.vue': 'Vue',
  'main.dart': 'Flutter',
  'SceneDelegate.swift': 'UIKit',
  'ContentView.swift': 'SwiftUI',
};

const ORMS: Record<string, string> = {
  'prisma': 'Prisma',
  'sequelize': 'Sequelize',
  'typeorm': 'TypeORM',
  'drizzle': 'Drizzle ORM',
  'hibernate': 'Hibernate',
  'jpa': 'Spring Data JPA',
  'sqlalchemy': 'SQLAlchemy',
  'django': 'Django ORM',
  'gorm': 'GORM',
  ' ActiveRecord': 'ActiveRecord',
};

const RUNTIMES: Record<string, string> = {
  'node': 'Node.js',
  'bun': 'Bun',
  'deno': 'Deno',
  'python': 'Python',
  'java': 'JVM',
  'go': 'Go',
  'rust': 'Rust',
};

async function fileExists(dir: string, filename: string): Promise<boolean> {
  try {
    await fs.access(path.join(dir, filename));
    return true;
  } catch {
    return false;
  }
}

async function readDirRecursive(dir: string, maxDepth = 2): Promise<string[]> {
  const files: string[] = [];

  async function walk(d: string, depth: number) {
    if (depth > maxDepth) return;
    try {
      const entries = await fs.readdir(d, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const full = path.join(d, entry.name);
        if (entry.isFile()) {
          files.push(entry.name);
        } else if (entry.isDirectory()) {
          // eslint-disable-next-line no-await-in-loop
          await walk(full, depth + 1);
        }
      }
    } catch {
      // skip inaccessible dirs
    }
  }

  await walk(dir, 0);
  return files;
}

export async function detectTechStack(projectPath: string): Promise<TechStack> {
  const rootFiles = await fs.readdir(projectPath);
  const allFiles = await readDirRecursive(projectPath);

  const present = new Set([...rootFiles, ...allFiles]);
  const presentLower = new Set([...present].map(f => f.toLowerCase()));

  // Detect framework
  const framework: string[] = [];
  for (const [file, fw] of Object.entries(UI_FRAMEWORKS)) {
    if (present.has(file)) framework.push(fw);
  }

  // Detect language from extensions
  const language = new Set<string>();
  for (const file of allFiles) {
    const ext = path.extname(file);
    if (LANGUAGES[ext]) language.add(LANGUAGES[ext]);
  }

  // Detect build tool
  const buildTool: string[] = [];
  for (const [file, tool] of Object.entries(BUILD_TOOLS)) {
    if (present.has(file)) buildTool.push(tool);
  }

  // Detect ORM from package.json or content
  const orm: string[] = [];
  if (present.has('package.json')) {
    try {
      const pkg = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [key, val] of Object.entries(deps)) {
        const v = val as string;
        if (ORM[key]) orm.push(ORM[key]);
        if (v?.includes('orm') || v?.includes('prisma') || v?.includes('sequi')) {
          const norm = key.replace(/[-_]/g, '').toLowerCase();
          if (norm.includes('prisma')) orm.push('Prisma');
          else if (norm.includes('sequelize')) orm.push('Sequelize');
          else if (norm.includes('typeorm')) orm.push('TypeORM');
          else if (norm.includes('drizzle')) orm.push('Drizzle ORM');
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  // Detect runtime
  const runtime: string[] = [];
  if (present.has('package.json')) runtime.push('Node.js');
  if (present.has('go.mod')) runtime.push('Go');
  if (present.has('Cargo.toml')) runtime.push('Rust');
  if (present.has('requirements.txt') || present.has('pyproject.toml')) runtime.push('Python');
  if (present.has('pom.xml') || present.has('build.gradle')) runtime.push('JVM');

  // Detect full-stack
  const fullStack: string[] = [];
  if (framework.includes('Next.js') || framework.includes('Nuxt.js')) fullStack.push('SSR/Isomorphic');
  if (present.has('__init__.py')) fullStack.push('Backend API');
  if (present.has('server') || present.has('api')) fullStack.push('API Layer');

  return {
    framework: [...new Set(framework)],
    language: [...language],
    buildTool: [...new Set(buildTool)],
    orm: [...new Set(orm)],
    uiFramework: framework,
    runtime: [...new Set(runtime)],
    fullStack: [...new Set(fullStack)],
  };
}

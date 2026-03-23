/**
 * buildDetector.ts — 打包/编译机制检测服务
 * Step 5 of 11-step import: 检测项目使用的打包/编译机制
 */

import * as fs from 'fs';
import * as path from 'path';

export interface BuildMechanism {
  tool: string;          // e.g. 'Vite', 'Webpack', 'CMake', 'Cargo'
  configFile?: string;   // e.g. 'vite.config.ts'
  buildCommand?: string; // e.g. 'npm run build'
  outputDir?: string;   // e.g. 'dist', 'build', 'target'
}

const BUILD_CONFIGS: Array<{ file: string; tool: string; outputDir?: string }> = [
  // JS/TS bundlers
  { file: 'vite.config.ts', tool: 'Vite', outputDir: 'dist' },
  { file: 'vite.config.js', tool: 'Vite', outputDir: 'dist' },
  { file: 'webpack.config.js', tool: 'Webpack', outputDir: 'dist' },
  { file: 'webpack.config.ts', tool: 'Webpack', outputDir: 'dist' },
  { file: 'rollup.config.js', tool: 'Rollup', outputDir: 'dist' },
  { file: 'esbuild.config.js', tool: 'esbuild', outputDir: 'dist' },
  { file: 'parcel.config.js', tool: 'Parcel', outputDir: 'dist' },
  { file: 'next.config.js', tool: 'Next.js', outputDir: '.next' },
  { file: 'nuxt.config.ts', tool: 'Nuxt.js', outputDir: '.output' },
  // Python
  { file: 'setup.py', tool: 'setuptools', outputDir: 'dist' },
  { file: 'pyproject.toml', tool: 'Poetry/setuptools', outputDir: 'dist' },
  { file: 'Makefile', tool: 'Make', outputDir: undefined },
  // Rust
  { file: 'Cargo.toml', tool: 'Cargo', outputDir: 'target' },
  // Go
  { file: 'go.mod', tool: 'Go modules', outputDir: undefined },
  // Java
  { file: 'pom.xml', tool: 'Maven', outputDir: 'target' },
  { file: 'build.gradle', tool: 'Gradle', outputDir: 'build' },
  { file: 'build.gradle.kts', tool: 'Gradle', outputDir: 'build' },
  // C/C++
  { file: 'CMakeLists.txt', tool: 'CMake', outputDir: 'build' },
  { file: 'meson.build', tool: 'Meson', outputDir: 'builddir' },
  // .NET
  { file: '*.csproj', tool: 'MSBuild', outputDir: 'bin' },
  { file: '*.sln', tool: 'MSBuild', outputDir: 'bin' },
];

const BUILD_COMMANDS: Record<string, string> = {
  'package.json': 'npm run build',
  'Cargo.toml': 'cargo build',
  'go.mod': 'go build',
  'pom.xml': 'mvn package',
  'build.gradle': './gradlew build',
  'CMakeLists.txt': 'cmake && make',
  'Makefile': 'make',
  'pyproject.toml': 'python -m build',
  'setup.py': 'python setup.py build',
};

/**
 * Detect build/packaging mechanisms for a project
 */
export async function detectBuildMechanism(projectPath: string): Promise<BuildMechanism[]> {
  const mechanisms: BuildMechanism[] = [];

  let entries: string[] = [];
  try {
    entries = await fs.readdir(projectPath);
  } catch {
    return mechanisms;
  }

  const entriesLower = new Set(entries.map(e => e.toLowerCase()));

  // Check for build config files
  for (const config of BUILD_CONFIGS) {
    if (config.file.includes('*')) {
      // Wildcard patterns
      const prefix = config.file.replace('*', '');
      const hasMatch = entries.some(e => e.startsWith(prefix) && e.endsWith('.csproj'));
      if (hasMatch || entriesLower.has(config.file.toLowerCase())) {
        mechanisms.push({
          tool: config.tool,
          outputDir: config.outputDir,
        });
      }
    } else if (entries.includes(config.file)) {
      mechanisms.push({
        tool: config.tool,
        configFile: config.file,
        outputDir: config.outputDir,
      });
    }
  }

  // Infer build commands from key files
  for (const [file, cmd] of Object.entries(BUILD_COMMANDS)) {
    if (entries.includes(file)) {
      const existing = mechanisms.find(m => m.tool === cmd.split(' ')[0]);
      if (!existing) {
        mechanisms.push({ tool: file.replace('.toml', '').replace('.gradle', ''), buildCommand: cmd });
      }
    }
  }

  return mechanisms;
}

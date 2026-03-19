/**
 * skillGenerator.ts — 自动 Skill 生成服务
 * 根据项目代码结构生成可复用的 Skill 文件
 */

import * as fs from 'fs';
import * as path from 'path';
import { CodeArchitecture } from './codeAnalyzer.js';

const SKILLS_DIR = path.join(process.env.HOME || '/root', '.openclaw', 'skills');

export interface GeneratedSkill {
  name: string;
  path: string;
  content: string;
}

export async function generateSkills(
  projectName: string,
  projectPath: string,
  arch: CodeArchitecture
): Promise<GeneratedSkill[]> {
  // 确保 skills 目录存在
  const projectSkillsDir = path.join(SKILLS_DIR, `project-${projectName}`);
  fs.mkdirSync(projectSkillsDir, { recursive: true });

  const skills: GeneratedSkill[] = [];

  // 1. 构建指南
  const buildSkill = generateBuildSkill(projectName, projectPath, arch);
  skills.push(writeSkill(projectSkillsDir, `project-${projectName}-build.md`, buildSkill));

  // 2. 代码结构
  const structureSkill = generateStructureSkill(projectName, arch);
  skills.push(writeSkill(projectSkillsDir, `project-${projectName}-structure.md`, structureSkill));

  // 3. 部署流程
  const deploySkill = generateDeploySkill(projectName, projectPath, arch);
  skills.push(writeSkill(projectSkillsDir, `project-${projectName}-deploy.md`, deploySkill));

  // 4. 测试规范
  const testSkill = generateTestSkill(projectName, projectPath, arch);
  skills.push(writeSkill(projectSkillsDir, `project-${projectName}-test.md`, testSkill));

  return skills;
}

function writeSkill(dir: string, filename: string, content: string): GeneratedSkill {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  return { name: filename, path: filePath, content };
}

function generateBuildSkill(name: string, projectPath: string, arch: Record<string, unknown>): string {
  const arch2 = arch as CodeArchitecture;
  const deps = Object.keys(arch2.dependencies || {}).slice(0, 10).join(', ') || '无';
  const devDeps = Object.keys(arch2.devDependencies || {}).slice(0, 10).join(', ') || '无';

  return `# ${name} — 构建指南

> 自动生成于 ${new Date().toISOString().slice(0, 19).replace('T', ' ')}

## 技术栈

- **构建工具**: ${arch2.devDependencies && Object.keys(arch2.devDependencies).length > 0 ? Object.keys(arch2.devDependencies).find(k => /vite|webpack|rollup|parcel|next|turbopack/i.test(k)) || 'npm' : 'npm'}
- **主要依赖**: ${deps}
- **开发依赖**: ${devDeps}

## 构建命令

\`\`\`bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 类型检查
npm run type-check

# 代码检查
npm run lint
\`\`\`

## 项目入口

${arch2.entryPoints && arch2.entryPoints.length > 0
    ? arch2.entryPoints.map(e => `- \`${e}\``).join('\n')
    : '- 未找到明确入口文件'}

## 注意事项

- 请在 \`${projectPath}\` 目录下执行以上命令
- 首次运行需要 \`npm install\` 安装依赖
`;
}

function generateStructureSkill(name: string, arch: Record<string, unknown>): string {
  const arch2 = arch as CodeArchitecture;
  const modulesMd = arch2.modules
    ?.map((m: ModuleInfo) => {
      let md = `### \`${m.name}/\`\n`;
      if (m.description) md += `${m.description}\n`;
      if (m.entryFiles && m.entryFiles.length > 0) {
        md += `入口: ${m.entryFiles.map(f => `\`${path.basename(f)}\``).join(', ')}\n`;
      }
      if (m.children && m.children.length > 0) {
        md += `子模块: ${m.children.map(c => `\`${c.name}/\``).join(', ')}\n`;
      }
      return md;
    })
    .join('\n') || '未检测到模块结构';

  return `# ${name} — 代码结构

> 自动生成于 ${new Date().toISOString().slice(0, 19).replace('T', ' ')}

## 模块架构

${modulesMd}

## 目录说明

${arch2.modules?.map((m: ModuleInfo) =>
  `- \`${m.name}/\` — ${getModuleDescription(m.name)}`
).join('\n') || '无模块信息'}

## 关键文件

${getKeyFiles(arch2)}
`;
}

function generateDeploySkill(name: string, projectPath: string, arch: Record<string, unknown>): string {
  const hasDocker = (arch as CodeArchitecture).modules?.some((m: ModuleInfo) =>
    m.name === 'docker' || m.name === 'Dockerfile'
  );
  const hasNginx = (arch as CodeArchitecture).modules?.some((m: ModuleInfo) =>
    m.name === 'nginx' || m.name === 'deploy'
  );

  return `# ${name} — 部署流程

> 自动生成于 ${new Date().toISOString().slice(0, 19).replace('T', ' ')}

## 部署方式

${hasDocker ? '**Docker 部署**\n```bash\ndocker build -t ' + name + ' .\ndocker run -p 3000:3000 ' + name + '\n```' : '**Node.js 部署**\n```bash\nnpm run build\nnpm start\n```'}

${hasNginx ? '\n**Nginx 部署**\n```bash\ncp deploy/nginx.conf /etc/nginx/conf.d/' + name + '.conf\nnginx -s reload\n```' : ''}

## 环境要求

- Node.js >= 18
- 内存 >= 2GB

## 配置

配置文件位置: \`${projectPath}/.env\`
参考模板: \`${projectPath}/.env.example\`
`;
}

function generateTestSkill(name: string, projectPath: string, arch: Record<string, unknown>): string {
  const hasTests = (arch as CodeArchitecture).modules?.some((m: ModuleInfo) =>
    m.name === 'test' || m.name === '__tests__' || m.name === 'tests' || m.name === 'spec'
  );

  return `# ${name} — 测试规范

> 自动生成于 ${new Date().toISOString().slice(0, 19).replace('T', ' ')}

## 测试命令

\`\`\`bash
# 运行所有测试
npm test

# 运行指定文件
npm test -- src/utils/helper.test.ts

# 覆盖率
npm run test:coverage
\`\`\`

## 测试规范

${hasTests ? '- 项目已配置测试框架，请参考 \`tests/\` 或 \`__tests__/\` 目录' : '- 项目尚未配置测试，建议添加 Jest 或 Vitest'}

## 覆盖率要求

- 核心业务逻辑 >= 80%
- 工具函数 >= 90%
- 组件 >= 60%
`;
}

// --- helpers ---
interface ModuleInfo {
  name: string;
  path: string;
  description?: string;
  entryFiles?: string[];
  children?: ModuleInfo[];
}

function getModuleDescription(name: string): string {
  const descs: Record<string, string> = {
    src: '源代码目录',
    lib: '库/工具函数',
    components: 'React/Vue 组件',
    pages: '页面组件',
    routes: '路由配置',
    api: 'API 接口',
    services: '业务服务层',
    utils: '工具函数',
    hooks: '自定义 Hooks',
    store: '状态管理',
    config: '配置文件',
    scripts: '脚本文件',
    docs: '文档',
    server: '服务端代码',
    app: '前端应用',
    tests: '测试文件',
    test: '测试文件',
    public: '静态资源',
    dist: '构建产物',
    build: '构建配置',
    deploy: '部署配置',
  };
  return descs[name] || `${name} 模块`;
}

function getKeyFiles(arch: CodeArchitecture): string {
  const files: string[] = [];
  for (const ep of (arch.entryPoints || []).slice(0, 5)) {
    files.push(`- \`${ep}\` — 入口文件`);
  }
  return files.length > 0 ? files.join('\n') : '- 无明确关键文件';
}

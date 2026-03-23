# 【Feature】F4 项目导入高级功能补全

> 优先级：中
> 前置依赖：【P0】H1 数据存储统一
> 关联模块：[项目导入模块](../modules/项目导入模块.md)

---

## 1. 现状分析

### 1.1 已有代码

| 文件 | 状态 | 说明 |
|------|------|------|
| `server/src/services/importOrchestrator.ts` | 已实现 | 导入流程编排，步骤管理（内存任务存储） |
| `server/src/services/gitClone.ts` | 已实现 | Git 仓库克隆（存在命令注入风险，见 M3） |
| `server/src/services/fileScanner.ts` | 已实现 | 文件系统扫描 |
| `server/src/services/codeAnalyzer.ts` | 已实现 | 技术栈识别 |
| `server/src/services/docParser.ts` | 已实现 | 文档解析（Markdown、纯文本） |
| `server/src/services/vectorStore.ts` | 已实现 | ChromaDB 向量存储 |
| `server/src/services/gitHistoryAnalysis.ts` | 骨架已有 | Git 历史分析接口 |
| `server/src/services/docConverter.ts` | 骨架已有 | 文档格式转换接口 |
| `app/import/page.tsx` | 已实现 | 导入向导前端页面 |

### 1.2 缺失功能（对照模块文档 11 步导入流程）

模块文档定义了 11 步导入流程，当前实际完成情况：

| 步骤 | 描述 | 状态 |
|------|------|------|
| 1 | 输入项目路径/URL | ✅ 已实现 |
| 2 | Git Clone / 本地路径验证 | ✅ 已实现 |
| 3 | 扫描文件结构 | ✅ 已实现 |
| 4 | 识别技术栈和框架 | ✅ 已实现 |
| 5 | 解析文档文件（README、docs/） | ⚠️ 部分（仅 Markdown） |
| 6 | 上下文压缩（长文档分块） | ❌ 未实现 |
| 7 | 生成项目摘要（LLM 驱动） | ❌ 未实现 |
| 8 | 向量化存储到 ChromaDB | ⚠️ 基础接口有，未与导入流程集成 |
| 9 | 自动生成 Skill 文件 | ❌ 未实现 |
| 10 | 文档格式转换（PPT/Word → HTML） | ❌ 未实现 |
| 11 | 历史变更分析（Git log） | ❌ 骨架有，未完成 |

---

## 2. 目标

补全导入流程中缺失的 6 个步骤，使项目导入后生成完整的项目记忆（摘要 + 向量化 + Skill 文件 + 历史分析）。

---

## 3. 实现步骤

### Step 1：上下文压缩 — 长文档分块

**新建 `server/src/services/contextCompressor.ts`**：

```typescript
export interface TextChunk {
  id: string;
  content: string;
  source: string;      // 来源文件路径
  startLine: number;
  endLine: number;
  tokenCount: number;
}

export class ContextCompressor {
  private maxChunkTokens: number;
  private overlapTokens: number;

  constructor(maxChunkTokens = 512, overlapTokens = 50) {
    this.maxChunkTokens = maxChunkTokens;
    this.overlapTokens = overlapTokens;
  }

  /**
   * 将长文本按语义边界分块
   * 优先按标题/段落分割，其次按 token 数量分割
   */
  chunk(text: string, source: string): TextChunk[] {
    // 1. 按 Markdown 标题分割
    // 2. 超过 maxChunkTokens 的段落继续按段落/句子分割
    // 3. 每块保留 overlapTokens 的重叠上下文
  }

  /**
   * 批量处理项目中的所有文档文件
   */
  async chunkProject(projectPath: string, files: string[]): Promise<TextChunk[]> {
    const allChunks: TextChunk[] = [];
    for (const file of files) {
      const content = fs.readFileSync(path.join(projectPath, file), 'utf-8');
      const chunks = this.chunk(content, file);
      allChunks.push(...chunks);
    }
    return allChunks;
  }
}
```

### Step 2：LLM 驱动的项目摘要生成

**新建 `server/src/services/projectSummaryGenerator.ts`**：

```typescript
export interface ProjectSummary {
  name: string;
  description: string;         // 1-2 段描述
  techStack: string[];
  architecture: string;        // 架构概述
  keyModules: Array<{
    name: string;
    path: string;
    description: string;
  }>;
  buildInstructions: string;   // 构建说明
  deployInstructions: string;  // 部署说明
}

export class ProjectSummaryGenerator {
  /**
   * 调用 LLM 生成项目摘要
   * 输入：README + 文件树 + package.json + 关键代码片段
   */
  async generate(context: {
    readme: string;
    fileTree: string;
    packageJson: object;
    techStack: string[];
    sampleCode: string[];      // 关键文件的前 50 行
  }): Promise<ProjectSummary> {
    const response = await llmService.chat({
      tier: 'medium',
      messages: [
        {
          role: 'system',
          content: '你是一个项目分析师。根据提供的项目信息，生成结构化的项目摘要。输出 JSON 格式。',
        },
        {
          role: 'user',
          content: `项目信息：\n\nREADME:\n${context.readme}\n\n文件树:\n${context.fileTree}\n\n技术栈: ${context.techStack.join(', ')}\n\npackage.json: ${JSON.stringify(context.packageJson, null, 2)}`,
        },
      ],
      maxTokens: 2048,
    });

    return JSON.parse(response.content);
  }
}
```

### Step 3：向量化存储集成到导入流程

**修改 `server/src/services/importOrchestrator.ts`**：

在导入步骤中增加向量化环节：

```typescript
// 新增步骤：向量化存储
async stepVectorize(taskId: string, projectPath: string): Promise<void> {
  this.updateStep(taskId, 'vectorize', 'running');

  // 1. 分块
  const chunks = await contextCompressor.chunkProject(projectPath, docFiles);

  // 2. 批量向量化写入 ChromaDB
  const collectionName = `project_${projectId}`;
  await vectorStore.addDocuments(collectionName, chunks.map(c => ({
    id: c.id,
    content: c.content,
    metadata: {
      source: c.source,
      startLine: c.startLine,
      endLine: c.endLine,
    },
  })));

  this.updateStep(taskId, 'vectorize', 'completed');
}
```

### Step 4：自动 Skill 文件生成

**新建 `server/src/services/skillGenerator.ts`**：

```typescript
export interface Skill {
  name: string;           // e.g. project-teamclaw-build
  content: string;        // Markdown 格式的 Skill 内容
  category: 'build' | 'structure' | 'deploy' | 'test' | 'convention';
}

export class SkillGenerator {
  /**
   * 基于项目信息自动生成 Skill 文件集合
   */
  async generate(summary: ProjectSummary, projectPath: string): Promise<Skill[]> {
    const skills: Skill[] = [];

    // 1. 构建 Skill：如何构建项目
    skills.push(await this.generateBuildSkill(summary));

    // 2. 结构 Skill：项目目录结构说明
    skills.push(await this.generateStructureSkill(summary));

    // 3. 部署 Skill：部署方式
    if (summary.deployInstructions) {
      skills.push(await this.generateDeploySkill(summary));
    }

    // 4. 代码规范 Skill：从 .eslintrc / .prettierrc 等提取
    const conventionSkill = await this.generateConventionSkill(projectPath);
    if (conventionSkill) skills.push(conventionSkill);

    return skills;
  }

  /**
   * 将 Skill 写入磁盘
   */
  async persist(skills: Skill[], outputDir: string): Promise<string[]> {
    const paths: string[] = [];
    for (const skill of skills) {
      const filePath = path.join(outputDir, `${skill.name}.md`);
      fs.writeFileSync(filePath, skill.content, 'utf-8');
      paths.push(filePath);
    }
    return paths;
  }
}
```

### Step 5：文档格式转换

**修改 `server/src/services/docConverter.ts`**：

```typescript
export type SupportedFormat = 'md' | 'txt' | 'docx' | 'pptx' | 'pdf' | 'html';

export class DocConverter {
  /**
   * 将文档转换为 HTML 以便在线浏览
   */
  async toHTML(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.md':
        return this.markdownToHTML(filePath);
      case '.docx':
        return this.docxToHTML(filePath);   // 使用 mammoth.js
      case '.pptx':
        return this.pptxToHTML(filePath);   // 使用 pptx2html 或自定义解析
      case '.pdf':
        return this.pdfToHTML(filePath);    // 使用 pdf-parse
      default:
        return this.plainTextToHTML(filePath);
    }
  }

  /**
   * 提取纯文本内容（用于向量化）
   */
  async toText(filePath: string): Promise<string>;
}
```

### Step 6：Git 历史变更分析

**修改 `server/src/services/gitHistoryAnalysis.ts`**：

```typescript
export interface HistoryAnalysis {
  totalCommits: number;
  contributors: Array<{ name: string; commits: number }>;
  recentActivity: Array<{
    date: string;
    commits: number;
    filesChanged: number;
  }>;
  hotFiles: Array<{
    path: string;
    changeCount: number;
    lastModified: string;
  }>;
  branchSummary: Array<{
    name: string;
    ahead: number;
    behind: number;
    lastCommit: string;
  }>;
}

export class GitHistoryAnalyzer {
  /**
   * 分析项目 Git 历史
   */
  async analyze(projectPath: string): Promise<HistoryAnalysis> {
    // 1. git log --format=... 获取提交历史
    // 2. git shortlog -sn 获取贡献者排名
    // 3. git log --stat 统计文件变更热度
    // 4. git branch -a 分析分支状态
  }

  /**
   * 生成历史分析摘要（LLM 驱动）
   */
  async generateInsight(analysis: HistoryAnalysis): Promise<string> {
    return llmService.chat({
      tier: 'light',
      messages: [
        {
          role: 'system',
          content: '根据 Git 历史分析数据，生成项目开发趋势洞察。',
        },
        { role: 'user', content: JSON.stringify(analysis) },
      ],
    }).then(r => r.content);
  }
}
```

### Step 7：更新导入编排器

**修改 `server/src/services/importOrchestrator.ts`**：

将新步骤加入导入流水线：

```typescript
const IMPORT_STEPS = [
  'clone',           // ✅ 已有
  'scan',            // ✅ 已有
  'detectStack',     // ✅ 已有
  'parseDocs',       // ✅ 已有（扩展）
  'compress',        // 🆕 上下文压缩
  'generateSummary', // 🆕 LLM 项目摘要
  'vectorize',       // 🆕 向量化存储
  'generateSkills',  // 🆕 Skill 文件生成
  'convertDocs',     // 🆕 文档格式转换
  'analyzeHistory',  // 🆕 Git 历史分析
  'finalize',        // ✅ 已有
];
```

---

## 4. 涉及文件

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `server/src/services/contextCompressor.ts` | 长文档分块服务 |
| 新建 | `server/src/services/projectSummaryGenerator.ts` | LLM 项目摘要生成 |
| 新建 | `server/src/services/skillGenerator.ts` | Skill 文件自动生成 |
| 修改 | `server/src/services/docConverter.ts` | 补全 DOCX/PPTX/PDF 转换 |
| 修改 | `server/src/services/gitHistoryAnalysis.ts` | 完整实现 Git 历史分析 |
| 修改 | `server/src/services/importOrchestrator.ts` | 增加 6 个新步骤 |
| 修改 | `server/src/services/vectorStore.ts` | 确保批量写入性能 |
| 修改 | `app/import/page.tsx` | 前端展示新增步骤进度 |

---

## 5. 新增依赖

```json
{
  "mammoth": "^1.6.0",
  "pdf-parse": "^1.1.1",
  "tiktoken": "^1.0.0"
}
```

---

## 6. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 导入项目后自动生成结构化项目摘要 | API 查询 `GET /api/v1/projects/:id` |
| 2 | 长文档被正确分块，每块 ≤ 512 tokens | 日志检查 chunk 数量 |
| 3 | 所有文档块写入 ChromaDB 对应 collection | ChromaDB 查询 |
| 4 | 自动生成至少 2 个 Skill 文件（build + structure） | 文件系统检查 |
| 5 | DOCX 文件转换为 HTML 在线可浏览 | 浏览器访问 |
| 6 | Git 历史分析包含贡献者排名和文件热度 | API 查询 |
| 7 | 前端导入向导展示全部 11 个步骤进度 | 浏览器截图 |
| 8 | 导入流程幂等：重复导入同一项目不产生重复数据 | 重复执行验证 |

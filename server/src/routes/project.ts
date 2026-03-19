import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { Project, ImportTask, ImportStep } from '../models/project.js';
import { cloneOrCopyProject } from '../services/gitClone.js';
import { scanDirectory } from '../services/fileScanner.js';
import { query as vectorQuery } from '../services/vectorStore.js';
import { analyzeGitHistory } from '../services/gitHistoryAnalysis.js';

const router = Router();

// In-memory storage (replace with DB later)
const projects = new Map<string, Project>();
const importTasks = new Map<string, ImportTask>();

// 1. POST /api/v1/projects/import — 创建导入任务
router.post('/import', async (req: Request, res: Response) => {
  const { source, url, localPath, name } = req.body as {
    source: 'url' | 'local';
    url?: string;
    localPath?: string;
    name?: string;
  };

  if (!source) {
    res.status(400).json(error(400, 'source is required (url | local)'));
    return;
  }

  if (source === 'url' && !url) {
    res.status(400).json(error(400, 'url is required when source is url'));
    return;
  }

  if (source === 'local' && !localPath) {
    res.status(400).json(error(400, 'localPath is required when source is local'));
    return;
  }

  try {
    // 1. Clone / 定位项目
    const projectPath = await cloneOrCopyProject(source, url, localPath);

    // 2. 扫描文件树
    const tree = await scanDirectory(projectPath);

    // 3. 生成项目信息
    const projectId = `proj_${Date.now()}`;
    const projectName = name || tree.name || projectPath.split('/').pop() || 'unknown';

    const project: Project = {
      id: projectId,
      name: projectName,
      source,
      url: url || undefined,
      localPath: source === 'local' ? projectPath : undefined,
      techStack: detectTechStack(tree),
      buildTool: detectBuildTool(tree),
      hasGit: true,
      importedAt: new Date().toISOString(),
      status: 'active',
    };

    projects.set(projectId, project);

    // 4. 创建导入任务（模拟多步骤进度）
    const taskId = `task_${Date.now()}`;
    const steps: ImportStep[] = [
      { step: 1, name: 'clone_or_copy', status: 'done' },
      { step: 2, name: 'scan_files', status: 'done' },
      { step: 3, name: 'detect_stack', status: 'done' },
      { step: 4, name: 'index_chromadb', status: 'pending' },
    ];

    const importTask: ImportTask = {
      taskId,
      projectId,
      status: 'processing',
      currentStep: 3,
      totalSteps: 4,
      steps,
      startedAt: new Date().toISOString(),
    };

    importTasks.set(taskId, importTask);

    res.status(201).json(success({ project, task: importTask }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    res.status(500).json(error(500, message));
  }
});

// 2. GET /api/v1/projects — 列表
router.get('/', (req: Request, res: Response) => {
  const list = Array.from(projects.values());
  res.json(success({ projects: list, total: list.length }));
});

// 3. GET /api/v1/projects/:id — 详情
router.get('/:id', (req: Request, res: Response) => {
  const project = projects.get(req.params.id);
  if (!project) {
    res.status(404).json(error(404, 'Project not found'));
    return;
  }
  res.json(success({ project }));
});

// 4. GET /api/v1/projects/:id/tree — 文件树
router.get('/:id/tree', async (req: Request, res: Response) => {
  const project = projects.get(req.params.id);
  if (!project) {
    res.status(404).json(error(404, 'Project not found'));
    return;
  }

  const basePath = project.localPath ||
    (project.source === 'url' ? `${process.env.HOME}/.openclaw/projects/${project.name}` : null);

  if (!basePath) {
    res.status(400).json(error(400, 'Project path not available'));
    return;
  }

  try {
    const tree = await scanDirectory(basePath);
    res.json(success({ tree }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed';
    res.status(500).json(error(500, message));
  }
});

// 5. GET /api/v1/projects/import/:taskId — 导入进度
router.get('/import/:taskId', (req: Request, res: Response) => {
  const task = importTasks.get(req.params.taskId);
  if (!task) {
    res.status(404).json(error(404, 'Import task not found'));
    return;
  }
  res.json(success({ task }));
});

// 6b. GET /api/v1/projects/:id/vector-search — 向量语义搜索
router.get('/:id/vector-search', async (req: Request, res: Response) => {
  const project = projects.get(req.params.id);
  if (!project) {
    res.status(404).json(error(404, 'Project not found'));
    return;
  }

  const { q, topK } = req.query as { q?: string; topK?: string };
  if (!q) {
    res.status(400).json(error(400, 'q (query) is required'));
    return;
  }

  try {
    const collectionName = `proj_${project.name}`;
    const results = await vectorQuery(collectionName, q, parseInt(topK || '5', 10));
    res.json(success({ query: q, results }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vector search failed';
    res.status(500).json(error(500, message));
  }
});

// 6c. GET /api/v1/projects/:id/git-history — Git历史分析
router.get('/:id/git-history', (req: Request, res: Response) => {
  const project = projects.get(req.params.id);
  if (!project) {
    res.status(404).json(error(404, 'Project not found'));
    return;
  }

  const basePath = project.localPath ||
    (project.source === 'url' ? `${process.env.HOME}/.openclaw/projects/${project.name}` : null);

  if (!basePath) {
    res.status(400).json(error(400, 'Project path not available for git analysis'));
    return;
  }

  try {
    const analysis = analyzeGitHistory(basePath);
    res.json(success({ analysis }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Git history analysis failed';
    res.status(500).json(error(500, message));
  }
});

// 7. DELETE /api/v1/projects/:id — 删除项目
router.delete('/:id', (req: Request, res: Response) => {
  const project = projects.get(req.params.id);
  if (!project) {
    res.status(404).json(error(404, 'Project not found'));
    return;
  }
  projects.delete(req.params.id);
  res.json(success({ deleted: req.params.id }));
});

// --- helpers ---

function detectTechStack(tree: { children?: { name: string; extension?: string }[] }): string[] {
  const stacks: string[] = [];
  const files = flattenFiles(tree);
  const names = files.map(f => f.name.toLowerCase());
  const exts = new Set(files.map(f => f.extension?.toLowerCase()).filter(Boolean));

  if (names.some(n => n === 'package.json')) stacks.push('Node.js');
  if (names.some(n => n === 'Cargo.toml')) stacks.push('Rust');
  if (names.some(n => n === 'go.mod')) stacks.push('Go');
  if (names.some(n => n === 'requirements.txt' || n === 'Pipfile' || n === 'pyproject.toml')) stacks.push('Python');
  if (names.some(n => n === 'pom.xml' || n === 'build.gradle')) stacks.push('Java');
  if (exts.has('.cs')) stacks.push('C#');
  if (exts.has('.swift')) stacks.push('Swift');
  if (exts.has('.kt')) stacks.push('Kotlin');
  if (exts.has('.dart')) stacks.push('Dart');
  if (exts.has('.vue')) stacks.push('Vue');
  if (exts.has('.jsx') || exts.has('.tsx')) stacks.push('React');

  return stacks.length ? stacks : ['Unknown'];
}

function detectBuildTool(tree: { children?: { name: string; extension?: string }[] }): string | undefined {
  const files = flattenFiles(tree);
  const names = files.map(f => f.name.toLowerCase());

  if (names.some(n => n === 'package.json')) return 'npm';
  if (names.some(n => n === 'Cargo.toml')) return 'cargo';
  if (names.some(n => n === 'go.mod')) return 'go';
  if (names.some(n => n === 'requirements.txt')) return 'pip';
  if (names.some(n => n === 'pom.xml')) return 'maven';
  if (names.some(n => n === 'build.gradle')) return 'gradle';
  if (names.some(n => n === 'CMakeLists.txt')) return 'cmake';

  return undefined;
}

function flattenFiles(node: { type: string; children?: { type: string; name: string; extension?: string }[] }): { name: string; extension?: string }[] {
  if (node.type === 'file') return [{ name: node.name, extension: node.extension }];
  if (!node.children) return [];
  return node.children.flatMap(child => flattenFiles(child as { type: string; children?: { type: string; name: string; extension?: string }[]; name: string; extension?: string }));
}

export default router;

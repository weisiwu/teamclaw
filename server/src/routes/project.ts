import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { Project, ImportTask } from '../models/project.js';
import { cloneOrCopyProject } from '../services/gitClone.js';
import { scanDirectory } from '../services/fileScanner.js';
import { detectTechStack } from '../services/techDetector.js';
import {
  createImportTask,
  runAllSteps,
  getTaskStatus,
  ImportContext,
} from '../services/importOrchestrator.js';
import { query as vectorQuery } from '../services/vectorStore.js';
import { analyzeGitHistory, parseGitLog } from '../services/gitHistoryAnalysis.js';

const router = Router();

// In-memory storage (replace with DB later)
const projects = new Map<string, Project>();

// 1. POST /api/v1/projects/import — 创建导入任务（异步编排）
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
    // 1. Clone / 定位项目（同步执行，获取 projectPath）
    const projectPath = await cloneOrCopyProject(source, url, localPath);

    // 2. 扫描文件树（同步执行，获取 tree.name 用于项目名）
    const tree = await scanDirectory(projectPath);

    // 3. 检测技术栈（使用 techDetector.ts）
    const techStack = await detectTechStack(projectPath);

    // 4. 生成项目信息
    const projectId = `proj_${Date.now()}`;
    const projectName = name || tree.name || projectPath.split('/').pop() || 'unknown';

    const project: Project = {
      id: projectId,
      name: projectName,
      source,
      url: url || undefined,
      localPath: source === 'local' ? projectPath : undefined,
      techStack: [
        ...techStack.language,
        ...techStack.framework,
      ],
      buildTool: techStack.buildTool[0],
      hasGit: true,
      importedAt: new Date().toISOString(),
      status: 'active',
    };

    projects.set(projectId, project);

    // 5. 通过 orchestrator 创建导入任务
    const importTask = createImportTask(projectId);

    // 6. 立即返回 201（后台异步执行剩余步骤）
    res.status(201).json(success({ project, task: importTask }));

    // 7. 后台异步执行所有剩余步骤
    const ctx: ImportContext = {
      source,
      url,
      localPath,
      projectPath,
      projectId,
      projectName,
      techStack,
      tree,
    };

    setImmediate(() => {
      runAllSteps(importTask.taskId, ctx).catch(err => {
        console.error('[importOrchestrator] runAllSteps failed:', err);
      });
    });
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
  const task = getTaskStatus(req.params.taskId);
  if (!task) {
    res.status(404).json(error(404, 'Import task not found'));
    return;
  }
  res.json(success({ task }));
});

// 6. GET /api/v1/projects/:id/vector-search — 向量语义搜索
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

// 7. GET /api/v1/projects/:id/git-history — Git历史分析
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
    const commits = parseGitLog(basePath);
    res.json(success({ analysis, commits }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Git history analysis failed';
    res.status(500).json(error(500, message));
  }
});

// 8. POST /api/v1/projects/:id/refresh — 手动触发项目刷新（增量更新）
router.post('/:id/refresh', async (req: Request, res: Response) => {
  const project = projects.get(req.params.id);
  if (!project) {
    res.status(404).json(error(404, 'Project not found'));
    return;
  }

  try {
    const { refreshProject } = await import('../services/projectRefresh.js');
    const result = await refreshProject(project);
    res.json(success({ refresh: result }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Refresh failed';
    res.status(500).json(error(500, message));
  }
});

// 9. GET /api/v1/projects/:id/feature-map — 获取功能定位文件
router.get('/:id/feature-map', async (req: Request, res: Response) => {
  const project = projects.get(req.params.id);
  if (!project) {
    res.status(404).json(error(404, 'Project not found'));
    return;
  }

  try {
    const { getFeatureMap } = await import('../services/featureMap.js');
    const featureMap = await getFeatureMap(req.params.id);
    if (!featureMap) {
      res.status(404).json(error(404, 'Feature map not generated yet'));
      return;
    }
    res.json(success({ featureMap }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get feature map';
    res.status(500).json(error(500, message));
  }
});

// 10. GET /api/v1/projects/:id/docs — 获取转换后的文档列表
router.get('/:id/docs', async (req: Request, res: Response) => {
  const project = projects.get(req.params.id);
  if (!project) {
    res.status(404).json(error(404, 'Project not found'));
    return;
  }

  try {
    const { getConvertedDocs } = await import('../services/docConverter.js');
    const docs = await getConvertedDocs(req.params.id);
    res.json(success({ docs, total: docs.length }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get docs';
    res.status(500).json(error(500, message));
  }
});

// 11. DELETE /api/v1/projects/:id — 删除项目
router.delete('/:id', (req: Request, res: Response) => {
  const project = projects.get(req.params.id);
  if (!project) {
    res.status(404).json(error(404, 'Project not found'));
    return;
  }
  projects.delete(req.params.id);
  res.json(success({ deleted: req.params.id }));
});

export default router;

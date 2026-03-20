// Branch 分支管理 API 路由
// 提供分支的 CRUD、设置主分支、保护等 API

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import {
  getAllBranches,
  getBranch,
  getBranchByName,
  getMainBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  setMainBranch,
  setBranchProtection,
  renameBranch,
  getBranchConfig,
  updateBranchConfig,
  getBranchStats,
  checkoutBranch,
} from '../services/branchService.js';

const router = Router();

// ========== 分支 CRUD ==========

// GET /api/v1/branches — 获取所有分支
router.get('/', (req: Request, res: Response) => {
  const { name, isMain, isProtected, page, pageSize } = req.query;

  let branches = getAllBranches();

  if (name && typeof name === 'string') {
    branches = branches.filter(b => b.name.includes(name));
  }
  if (isMain !== undefined) {
    branches = branches.filter(b => b.isMain === (isMain === 'true'));
  }
  if (isProtected !== undefined) {
    branches = branches.filter(b => b.isProtected === (isProtected === 'true'));
  }

  const total = branches.length;
  const p = parseInt(page as string) || 1;
  const ps = parseInt(pageSize as string) || 50;
  const start = (p - 1) * ps;
  const data = branches.slice(start, start + ps);

  res.json(success({
    data,
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.ceil(total / ps),
  }));
});

// GET /api/v1/branches/stats — 获取分支统计
router.get('/stats', (_req: Request, res: Response) => {
  res.json(success(getBranchStats()));
});

// GET /api/v1/branches/main — 获取主分支
router.get('/main', (_req: Request, res: Response) => {
  const main = getMainBranch();
  if (!main) {
    res.status(404).json(error(404, 'No main branch found'));
    return;
  }
  res.json(success(main));
});

// GET /api/v1/branches/config — 获取分支配置
router.get('/config', (_req: Request, res: Response) => {
  res.json(success(getBranchConfig()));
});

// PUT /api/v1/branches/config — 更新分支配置
router.put('/config', (req: Request, res: Response) => {
  const config = req.body;
  const updated = updateBranchConfig(config);
  res.json(success(updated));
});

// GET /api/v1/branches/:id — 获取单个分支
router.get('/:id', (req: Request, res: Response) => {
  // 支持按名称查找
  let branch = getBranch(req.params.id);
  if (!branch) {
    branch = getBranchByName(req.params.id);
  }
  if (!branch) {
    res.status(404).json(error(404, 'Branch not found'));
    return;
  }
  res.json(success(branch));
});

// POST /api/v1/branches — 创建分支
router.post('/', (req: Request, res: Response) => {
  const { name, author, versionId, baseBranch, description } = req.body as {
    name: string;
    author?: string;
    versionId?: string;
    baseBranch?: string;
    description?: string;
  };

  if (!name || typeof name !== 'string') {
    res.status(400).json(error(400, 'Branch name is required'));
    return;
  }

  // 名称格式校验
  if (!/^[a-zA-Z0-9_./-]+$/.test(name)) {
    res.status(400).json(error(400, 'Invalid branch name. Use only alphanumeric, _, ., /, -'));
    return;
  }

  try {
    const branch = createBranch({ name, author, versionId, baseBranch, description });
    res.status(201).json(success(branch));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create branch';
    res.status(409).json(error(409, message));
  }
});

// PUT /api/v1/branches/:id — 更新分支
router.put('/:id', (req: Request, res: Response) => {
  const branch = getBranch(req.params.id);
  if (!branch) {
    res.status(404).json(error(404, 'Branch not found'));
    return;
  }

  const { description, commitMessage, author } = req.body as {
    description?: string;
    commitMessage?: string;
    author?: string;
  };

  try {
    const updated = updateBranch(req.params.id, {
      ...(description !== undefined && { description }),
      ...(commitMessage !== undefined && { commitMessage }),
      ...(author !== undefined && { author }),
    });
    res.json(success(updated));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update branch';
    res.status(400).json(error(400, message));
  }
});

// DELETE /api/v1/branches/:id — 删除分支
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = deleteBranch(req.params.id);
    if (!deleted) {
      res.status(404).json(error(404, 'Branch not found'));
      return;
    }
    res.json(success({ deleted: true }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete branch';
    res.status(403).json(error(403, message));
  }
});

// ========== 分支操作 ==========

// PUT /api/v1/branches/:id/main — 设置为主分支
router.put('/:id/main', (req: Request, res: Response) => {
  const branch = getBranch(req.params.id);
  if (!branch) {
    res.status(404).json(error(404, 'Branch not found'));
    return;
  }

  const updated = setMainBranch(req.params.id);
  res.json(success(updated));
});

// PUT /api/v1/branches/:id/protect — 设置保护状态
router.put('/:id/protect', (req: Request, res: Response) => {
  const { protected: isProtected } = req.body as { protected: boolean };

  const branch = getBranch(req.params.id);
  if (!branch) {
    res.status(404).json(error(404, 'Branch not found'));
    return;
  }

  try {
    const updated = setBranchProtection(req.params.id, isProtected);
    res.json(success(updated));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to set protection';
    res.status(403).json(error(403, message));
  }
});

// PUT /api/v1/branches/:id/rename — 重命名分支
router.put('/:id/rename', (req: Request, res: Response) => {
  const { newName } = req.body as { newName: string };

  if (!newName || typeof newName !== 'string') {
    res.status(400).json(error(400, 'New name is required'));
    return;
  }

  if (!/^[a-zA-Z0-9_./-]+$/.test(newName)) {
    res.status(400).json(error(400, 'Invalid branch name'));
    return;
  }

  try {
    const updated = renameBranch(req.params.id, newName);
    if (!updated) {
      res.status(404).json(error(404, 'Branch not found'));
      return;
    }
    res.json(success(updated));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to rename branch';
    res.status(403).json(error(403, message));
  }
});

// PUT /api/v1/branches/:id/checkout — 检出（切换到）分支
router.put('/:id/checkout', (req: Request, res: Response) => {
  const branch = getBranch(req.params.id);
  if (!branch) {
    res.status(404).json(error(404, 'Branch not found'));
    return;
  }

  try {
    const updated = checkoutBranch(req.params.id);
    res.json(success(updated));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to checkout branch';
    res.status(400).json(error(400, message));
  }
});

export default router;

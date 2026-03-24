/**
 * Skill Routes
 * /api/v1/skills
 */

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import { skillService } from '../services/skillService.js';
import type { AuthRequest } from '../middleware/auth.js';
import type { CreateSkillParams, UpdateSkillParams, SkillCategory } from '../models/skill.js';

const router = Router();

/**
 * GET /api/v1/skills
 * 获取所有 Skills
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const options: Parameters<typeof skillService.getAllSkills>[0] = {};

    if (req.query.category) {
      options.category = req.query.category as SkillCategory;
    }

    if (req.query.source) {
      options.source = req.query.source as 'generated' | 'user' | 'imported';
    }

    if (req.query.agentId) {
      options.agentId = req.query.agentId as string;
    }

    if (req.query.enabled !== undefined) {
      options.enabled = req.query.enabled === 'true';
    }

    if (req.query.tags) {
      options.tags = (req.query.tags as string).split(',').map(t => t.trim());
    }

    if (req.query.search) {
      options.searchQuery = req.query.search as string;
    }

    const skills = await skillService.getAllSkills(options);
    res.json(success(skills));
  } catch (err) {
    console.error('[skill] Failed to list skills:', err);
    res.status(500).json(error(500, 'Failed to list skills'));
  }
});

/**
 * GET /api/v1/skills/summaries
 * 获取 Skill 摘要列表（轻量级）
 */
router.get('/summaries', async (_req: Request, res: Response) => {
  try {
    const summaries = await skillService.getSkillSummaries();
    res.json(success(summaries));
  } catch (err) {
    console.error('[skill] Failed to get skill summaries:', err);
    res.status(500).json(error(500, 'Failed to get skill summaries'));
  }
});

/**
 * GET /api/v1/skills/categories
 * 获取所有 Skill 类别
 */
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = ['build', 'deploy', 'test', 'structure', 'coding', 'review', 'custom'];
    res.json(success(categories));
  } catch (err) {
    console.error('[skill] Failed to get categories:', err);
    res.status(500).json(error(500, 'Failed to get categories'));
  }
});

/**
 * GET /api/v1/skills/stats
 * 获取 Skill 统计信息
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await skillService.getSkillStats();
    res.json(success(stats));
  } catch (err) {
    console.error('[skill] Failed to get skill stats:', err);
    res.status(500).json(error(500, 'Failed to get skill stats'));
  }
});

/**
 * POST /api/v1/skills/sync
 * 同步磁盘 Skills（仅管理员）
 */
router.post('/sync', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await skillService.syncSkillsFromDisk();
    res.json(success(result));
  } catch (err) {
    console.error('[skill] Failed to sync skills:', err);
    res.status(500).json(error(500, 'Failed to sync skills'));
  }
});

/**
 * GET /api/v1/skills/directory
 * 获取 Skills 目录路径（仅管理员）
 */
router.get('/directory', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const directory = skillService.getSkillsDirectory();
    res.json(success({ directory }));
  } catch (err) {
    console.error('[skill] Failed to get directory:', err);
    res.status(500).json(error(500, 'Failed to get skills directory'));
  }
});

/**
 * GET /api/v1/skills/for-agent/:agentId
 * 获取适用于指定 Agent 的 Skills
 */
router.get('/for-agent/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const skills = await skillService.getSkillsForAgent(agentId);
    res.json(success(skills));
  } catch (err) {
    console.error('[skill] Failed to get skills for agent:', err);
    res.status(500).json(error(500, 'Failed to get skills for agent'));
  }
});

/**
 * GET /api/v1/skills/:id
 * 获取单个 Skill 详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const skill = await skillService.getSkillById(id);

    if (!skill) {
      res.status(404).json(error(404, 'Skill not found'));
      return;
    }

    res.json(success(skill));
  } catch (err) {
    console.error('[skill] Failed to get skill:', err);
    res.status(500).json(error(500, 'Failed to get skill'));
  }
});

/**
 * POST /api/v1/skills
 * 创建新 Skill（仅管理员）
 */
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const params = req.body as CreateSkillParams;
    const createdBy = req.user?.id || 'unknown';

    // 验证必填字段
    if (!params.name || !params.displayName || !params.description || !params.category || !params.content) {
      res.status(400).json(error(400, 'Missing required fields: name, displayName, description, category, content'));
      return;
    }

    // 验证名称格式
    if (!/^[a-zA-Z0-9_-]+$/.test(params.name)) {
      res.status(400).json(error(400, 'Invalid name format. Only alphanumeric, underscore, and hyphen allowed'));
      return;
    }

    // 验证 category
    const validCategories = ['build', 'deploy', 'test', 'structure', 'coding', 'review', 'custom'];
    if (!validCategories.includes(params.category)) {
      res.status(400).json(error(400, `Invalid category. Must be one of: ${validCategories.join(', ')}`));
      return;
    }

    const skill = await skillService.createSkill(params, createdBy);
    res.status(201).json(success(skill));
  } catch (err) {
    console.error('[skill] Failed to create skill:', err);
    if (err instanceof Error && err.message.includes('already exists')) {
      res.status(409).json(error(409, err.message));
      return;
    }
    res.status(500).json(error(500, 'Failed to create skill'));
  }
});

/**
 * PUT /api/v1/skills/:id
 * 更新 Skill（仅管理员）
 */
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const params = req.body as UpdateSkillParams;

    // 验证 category
    if (params.category) {
      const validCategories = ['build', 'deploy', 'test', 'structure', 'coding', 'review', 'custom'];
      if (!validCategories.includes(params.category)) {
        res.status(400).json(error(400, `Invalid category. Must be one of: ${validCategories.join(', ')}`));
        return;
      }
    }

    const skill = await skillService.updateSkill(id, params);

    if (!skill) {
      res.status(404).json(error(404, 'Skill not found'));
      return;
    }

    res.json(success(skill));
  } catch (err) {
    console.error('[skill] Failed to update skill:', err);
    res.status(500).json(error(500, 'Failed to update skill'));
  }
});

/**
 * DELETE /api/v1/skills/:id
 * 删除 Skill（仅管理员）
 */
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await skillService.deleteSkill(id);

    if (!deleted) {
      res.status(404).json(error(404, 'Skill not found'));
      return;
    }

    res.json(success({ deleted: true }));
  } catch (err) {
    console.error('[skill] Failed to delete skill:', err);
    res.status(500).json(error(500, 'Failed to delete skill'));
  }
});

/**
 * PATCH /api/v1/skills/:id/enable
 * 启用/禁用 Skill（仅管理员）
 */
router.patch('/:id/enable', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body as { enabled: boolean };

    if (typeof enabled !== 'boolean') {
      res.status(400).json(error(400, 'enabled must be a boolean'));
      return;
    }

    const skill = await skillService.toggleSkillEnabled(id, enabled);

    if (!skill) {
      res.status(404).json(error(404, 'Skill not found'));
      return;
    }

    res.json(success(skill));
  } catch (err) {
    console.error('[skill] Failed to toggle skill:', err);
    res.status(500).json(error(500, 'Failed to toggle skill'));
  }
});

/**
 * PUT /api/v1/skills/:id/toggle
 * 切换 Skill 启用/禁用状态（仅管理员）
 */
router.put('/:id/toggle', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 获取当前状态再切换
    const skill = await skillService.getSkillById(id);

    if (!skill) {
      res.status(404).json(error(404, 'Skill not found'));
      return;
    }

    const updated = await skillService.toggleSkillEnabled(id, !skill.enabled);

    if (!updated) {
      res.status(404).json(error(404, 'Skill not found'));
      return;
    }

    res.json(success(updated));
  } catch (err) {
    console.error('[skill] Failed to toggle skill:', err);
    res.status(500).json(error(500, 'Failed to toggle skill'));
  }
});

/**
 * GET /api/v1/skills/export
 * 导出所有 Skills 为 JSON 下载（仅管理员）
 */
router.get('/export', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const skills = await skillService.getAllSkills();
    const json = JSON.stringify(skills, null, 2);
    const filename = `skills-export-${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(json));
    res.send(json);
  } catch (err) {
    console.error('[skill] Failed to export skills:', err);
    res.status(500).json(error(500, 'Failed to export skills'));
  }
});

/**
 * POST /api/v1/skills/import
 * 批量导入 Skills（JSON，仅管理员）
 */
router.post('/import', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;

    // 支持两种格式：{ skills: [...] } 或直接数组 [...]
    const items: unknown[] = Array.isArray(body) ? body : body.skills;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json(error(400, 'Request body must be a JSON array of skills or { skills: [...] }'));
      return;
    }

    const createdBy = req.user?.id || 'import';
    const results: { name: string; id?: string; error?: string }[] = [];

    for (const item of items) {
      if (!item || typeof item !== 'object') {
        results.push({ name: 'unknown', error: 'Invalid item: not an object' });
        continue;
      }

      const skillData = item as Record<string, unknown>;

      // 验证必填字段
      if (!skillData.name || !skillData.displayName || !skillData.description || !skillData.category || !skillData.content) {
        results.push({ name: String(skillData.name || 'unknown'), error: 'Missing required fields' });
        continue;
      }

      // 验证名称格式
      if (!/^[a-zA-Z0-9_-]+$/.test(String(skillData.name))) {
        results.push({ name: String(skillData.name), error: 'Invalid name format' });
        continue;
      }

      try {
        const created = await skillService.createSkill(
          {
            name: String(skillData.name),
            displayName: String(skillData.displayName),
            description: String(skillData.description),
            category: String(skillData.category),
            content: String(skillData.content),
            filePath: skillData.filePath as CreateSkillParams['filePath'],
            applicableAgents: skillData.applicableAgents as CreateSkillParams['applicableAgents'] || [],
            tags: skillData.tags as CreateSkillParams['tags'] || [],
            version: String(skillData.version || '1.0.0'),
            projectId: skillData.projectId as CreateSkillParams['projectId'],
          },
          createdBy
        );
        results.push({ name: created.name, id: created.id });
      } catch (err) {
        results.push({ name: String(skillData.name), error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    const succeeded = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;

    res.json(success({
      total: items.length,
      succeeded,
      failed,
      results,
    }));
  } catch (err) {
    console.error('[skill] Failed to import skills:', err);
    res.status(500).json(error(500, 'Failed to import skills'));
  }
});

export default router;

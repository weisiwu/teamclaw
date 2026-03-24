// Skill API 路由

import { Router } from 'express';
import { skillService } from '../services/skillService.js';
import { success, error } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// 获取所有 Skills
router.get('/', (req, res) => {
  const { category, source, q } = req.query;
  let list = skillService.getSkills();

  if (category) {
    list = skillService.getSkillsByCategory(category as string);
  }
  if (source) {
    list = skillService.getSkillsBySource(source as string);
  }
  if (q) {
    list = skillService.searchSkills(q as string);
  }

  res.json(success({ list }));
});

// 获取单个 Skill
router.get('/:id', (req, res) => {
  const skill = skillService.getSkill(req.params.id);
  if (!skill) {
    return res.status(404).json(error(404, 'Skill 不存在', 'SKILL_NOT_FOUND'));
  }
  res.json(success(skill));
});

// 获取 Skill 内容（Markdown 原文）
router.get('/:id/content', (req, res) => {
  const skill = skillService.getSkill(req.params.id);
  if (!skill) {
    return res.status(404).json(error(404, 'Skill 不存在', 'SKILL_NOT_FOUND'));
  }
  res.json(success({ content: skill.content }));
});

// 创建 Skill（仅管理员）
router.post('/', requireAuth, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'admin' && userRole !== 'vice_admin') {
    return res.status(403).json(error(403, '只有管理员可以创建 Skill', 'FORBIDDEN'));
  }

  const { name, displayName, description, category, content, applicableAgents, tags } = req.body;

  if (!name || !displayName || !description || !category) {
    return res.status(400).json(error(400, '缺少必填字段', 'INVALID_PARAMS'));
  }

  const skill = skillService.createSkill({
    name,
    displayName,
    description,
    category,
    source: 'user',
    content: content || '',
    applicableAgents: applicableAgents || [],
    enabled: true,
    tags: tags || [],
    version: '1.0.0',
  });

  res.json(success(skill));
});

// 更新 Skill（仅管理员）
router.put('/:id', requireAuth, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'admin' && userRole !== 'vice_admin') {
    return res.status(403).json(error(403, '只有管理员可以更新 Skill', 'FORBIDDEN'));
  }

  const skill = skillService.updateSkill(req.params.id, req.body);
  if (!skill) {
    return res.status(404).json(error(404, 'Skill 不存在', 'SKILL_NOT_FOUND'));
  }
  res.json(success(skill));
});

// 删除 Skill（仅管理员，磁盘来源不可删除）
router.delete('/:id', requireAuth, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'admin' && userRole !== 'vice_admin') {
    return res.status(403).json(error(403, '只有管理员可以删除 Skill', 'FORBIDDEN'));
  }

  const deleted = skillService.deleteSkill(req.params.id);
  if (!deleted) {
    return res.status(400).json(error(400, 'Skill 不存在或磁盘来源不可删除', 'SKILL_DELETE_FAILED'));
  }
  res.json(success({ message: 'Skill 已删除' }));
});

// 切换启用状态（仅管理员）
router.put('/:id/toggle', requireAuth, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'admin' && userRole !== 'vice_admin') {
    return res.status(403).json(error(403, '只有管理员可以操作 Skill', 'FORBIDDEN'));
  }

  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json(error(400, 'enabled 参数必须为 boolean', 'INVALID_PARAMS'));
  }

  const skill = skillService.toggleSkill(req.params.id, enabled);
  if (!skill) {
    return res.status(404).json(error(404, 'Skill 不存在', 'SKILL_NOT_FOUND'));
  }
  res.json(success(skill));
});

// 强制从磁盘同步 Skills（仅管理员）
router.post('/sync', requireAuth, (req, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'admin' && userRole !== 'vice_admin') {
    return res.status(403).json(error(403, '只有管理员可以同步 Skills', 'FORBIDDEN'));
  }

  const stats = skillService.forceSyncFromDisk();
  res.json(success(stats));
});

// 获取同步状态信息
router.get('/meta/sync-stats', (_req, res) => {
  const stats = skillService.getSyncStats();
  res.json(success(stats));
});

export default router;

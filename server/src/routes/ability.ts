import { Router } from 'express';
import { abilityService } from '../services/abilityService.js';
import { success, error } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// 获取所有能力列表
router.get('/', (req, res) => {
  const abilities = abilityService.getAbilities();
  res.json(success({ list: abilities }));
});

// 获取单个能力
router.get('/:id', (req, res) => {
  const ability = abilityService.getAbility(req.params.id);
  if (!ability) {
    return res.status(404).json(error(404, '能力不存在', 'ABILITY_NOT_FOUND'));
  }
  res.json(success(ability));
});

// 切换能力状态 (仅管理员)
// FIX: 使用 requireAuth 中间件从 JWT Token 获取身份，禁止从 Header 伪造身份
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.put('/:id/toggle', requireAuth, (req: any, res) => {
  const { enabled } = req.body;
  const userRole = req.user?.role;

  // 只有管理员可以切换能力状态
  if (userRole !== 'admin' && userRole !== 'vice_admin') {
    return res.status(403).json(error(403, '只有管理员可以操作能力开关', 'FORBIDDEN'));
  }

  if (typeof enabled !== 'boolean') {
    return res.status(400).json(error(400, 'enabled 参数必须为 boolean', 'INVALID_PARAMS'));
  }

  const ability = abilityService.updateAbility(req.params.id, enabled);
  if (!ability) {
    return res.status(404).json(error(404, '能力不存在', 'ABILITY_NOT_FOUND'));
  }

  res.json(success(ability));
});

// 重置所有能力到默认状态 (仅管理员)
// FIX: 使用 requireAuth 中间件从 JWT Token 获取身份，禁止从 Header 伪造身份
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/reset', requireAuth, (req: any, res) => {
  const userRole = req.user?.role;
  if (userRole !== 'admin') {
    return res.status(403).json(error(403, '只有管理员可以重置能力', 'FORBIDDEN'));
  }
  abilityService.resetAbilities();
  res.json(success({ message: '能力已重置到默认状态' }));
});

export default router;

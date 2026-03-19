import { Router } from 'express';
import { abilityService } from '../services/abilityService.js';
import { success, error } from '../utils/response.js';

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
    return res.status(404).json(error('ABILITY_NOT_FOUND', '能力不存在'));
  }
  res.json(success(ability));
});

// 切换能力状态 (仅管理员)
router.put('/:id/toggle', (req, res) => {
  const { enabled } = req.body;
  const userRole = req.headers['x-user-role'] as string || 'user';

  // 只有管理员可以切换能力状态
  if (userRole !== 'admin' && userRole !== 'sub_admin') {
    return res.status(403).json(error('FORBIDDEN', '只有管理员可以操作能力开关'));
  }

  if (typeof enabled !== 'boolean') {
    return res.status(400).json(error('INVALID_PARAMS', 'enabled 参数必须为 boolean'));
  }

  const ability = abilityService.updateAbility(req.params.id, enabled);
  if (!ability) {
    return res.status(404).json(error('ABILITY_NOT_FOUND', '能力不存在'));
  }

  res.json(success(ability));
});

// 重置所有能力到默认状态 (仅管理员)
router.post('/reset', (req, res) => {
  const userRole = req.headers['x-user-role'] as string || 'user';
  if (userRole !== 'admin') {
    return res.status(403).json(error('FORBIDDEN', '只有管理员可以重置能力'));
  }
  abilityService.resetAbilities();
  res.json(success({ message: '能力已重置到默认状态' }));
});

export default router;

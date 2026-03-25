/**
 * Experiment Routes
 * /api/v1/experiments
 *
 * 自主实验循环的 HTTP API
 */

import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  dispatchAutonomousLoop,
  abortAutonomousLoop,
  getActiveAutonomousLoops,
} from '../services/agentExecution.js';
import { experimentTracker } from '../services/experimentTracker.js';
import { gitExperiment } from '../services/gitExperiment.js';
import type { MetricDirection } from '../services/experimentTracker.js';

const router = Router();

// ========== 实验会话管理 ==========

/**
 * POST /api/v1/experiments/start
 * 启动自主实验循环
 */
router.post('/start', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      dispatcher = 'main',
      targetAgent = 'coder1',
      taskId,
      prompt,
      projectPath,
      sessionTag,
      verifyCommand,
      metricName,
      metricDirection,
      maxIterations,
      iterationTimeoutMs,
      model,
    } = req.body;

    // 验证必填字段
    if (!prompt || !projectPath || !sessionTag || !verifyCommand || !metricName || !metricDirection) {
      res.status(400).json(error(400,
        'Missing required fields: prompt, projectPath, sessionTag, verifyCommand, metricName, metricDirection'
      ));
      return;
    }

    // 验证 metricDirection
    if (!['lower_is_better', 'higher_is_better'].includes(metricDirection)) {
      res.status(400).json(error(400, 'metricDirection must be lower_is_better or higher_is_better'));
      return;
    }

    const result = await dispatchAutonomousLoop({
      dispatcher,
      targetAgent,
      taskId: taskId || `exp_${sessionTag}`,
      prompt,
      projectPath,
      sessionTag,
      verifyCommand,
      metricName,
      metricDirection: metricDirection as MetricDirection,
      maxIterations,
      iterationTimeoutMs,
      model,
    });

    if ('error' in result) {
      res.status(400).json(error(400, result.error));
      return;
    }

    res.status(201).json(success(result));
  } catch (err) {
    console.error('[experiment] Failed to start experiment:', err);
    res.status(500).json(error(500, 'Failed to start experiment'));
  }
});

/**
 * POST /api/v1/experiments/:sessionId/abort
 * 中止实验循环
 */
router.post('/:sessionId/abort', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const aborted = abortAutonomousLoop(sessionId);

    if (!aborted) {
      // 也尝试在 DB 层面更新状态
      await experimentTracker.updateSessionStatus(sessionId, 'aborted');
    }

    res.json(success({ aborted: true, sessionId }));
  } catch (err) {
    console.error('[experiment] Failed to abort experiment:', err);
    res.status(500).json(error(500, 'Failed to abort experiment'));
  }
});

/**
 * GET /api/v1/experiments/active
 * 获取活跃的实验循环列表
 */
router.get('/active', async (_req: Request, res: Response) => {
  try {
    const activeIds = getActiveAutonomousLoops();
    const sessions = await experimentTracker.getActiveSessions();
    res.json(success({ activeLoopIds: activeIds, sessions }));
  } catch (err) {
    console.error('[experiment] Failed to get active experiments:', err);
    res.status(500).json(error(500, 'Failed to get active experiments'));
  }
});

// ========== 会话查询 ==========

/**
 * GET /api/v1/experiments/sessions
 * 获取实验会话列表（分页）
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const { status, agentName, limit, offset } = req.query;
    const result = await experimentTracker.getAllSessions({
      status: status as string | undefined as any,
      agentName: agentName as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json(success(result));
  } catch (err) {
    console.error('[experiment] Failed to get sessions:', err);
    res.status(500).json(error(500, 'Failed to get sessions'));
  }
});

/**
 * GET /api/v1/experiments/sessions/:sessionId
 * 获取实验会话详情
 */
router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await experimentTracker.getSession(sessionId);

    if (!session) {
      res.status(404).json(error(404, 'Session not found'));
      return;
    }

    res.json(success(session));
  } catch (err) {
    console.error('[experiment] Failed to get session:', err);
    res.status(500).json(error(500, 'Failed to get session'));
  }
});

/**
 * GET /api/v1/experiments/sessions/:sessionId/summary
 * 获取实验会话摘要（含统计）
 */
router.get('/sessions/:sessionId/summary', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const summary = await experimentTracker.getSessionSummary(sessionId);

    if (!summary) {
      res.status(404).json(error(404, 'Session not found'));
      return;
    }

    res.json(success(summary));
  } catch (err) {
    console.error('[experiment] Failed to get session summary:', err);
    res.status(500).json(error(500, 'Failed to get session summary'));
  }
});

// ========== 实验结果查询 ==========

/**
 * GET /api/v1/experiments/sessions/:sessionId/results
 * 获取实验会话的所有结果
 */
router.get('/sessions/:sessionId/results', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const results = await experimentTracker.getSessionResults(sessionId);
    res.json(success(results));
  } catch (err) {
    console.error('[experiment] Failed to get results:', err);
    res.status(500).json(error(500, 'Failed to get results'));
  }
});

// ========== Git 实验分支管理 ==========

/**
 * GET /api/v1/experiments/git/status
 * 获取项目的 Git 状态
 */
router.get('/git/status', async (req: Request, res: Response) => {
  try {
    const projectPath = req.query.projectPath as string;
    if (!projectPath) {
      res.status(400).json(error(400, 'Missing projectPath'));
      return;
    }

    const [branch, commitHash, isClean] = await Promise.all([
      gitExperiment.getCurrentBranch(projectPath),
      gitExperiment.getCurrentCommitHash(projectPath),
      gitExperiment.isWorkingTreeClean(projectPath),
    ]);

    res.json(success({ branch, commitHash, isClean }));
  } catch (err) {
    console.error('[experiment] Failed to get git status:', err);
    res.status(500).json(error(500, 'Failed to get git status'));
  }
});

/**
 * GET /api/v1/experiments/git/log
 * 获取实验分支的 commit 日志
 */
router.get('/git/log', async (req: Request, res: Response) => {
  try {
    const projectPath = req.query.projectPath as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    if (!projectPath) {
      res.status(400).json(error(400, 'Missing projectPath'));
      return;
    }

    const log = await gitExperiment.getExperimentLog(projectPath, limit);
    res.json(success(log));
  } catch (err) {
    console.error('[experiment] Failed to get git log:', err);
    res.status(500).json(error(500, 'Failed to get git log'));
  }
});

/**
 * POST /api/v1/experiments/git/merge
 * 合并实验分支到基础分支
 */
router.post('/git/merge', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { projectPath, branchName, baseBranch, squash } = req.body;

    if (!projectPath || !branchName || !baseBranch) {
      res.status(400).json(error(400, 'Missing required: projectPath, branchName, baseBranch'));
      return;
    }

    const commitInfo = await gitExperiment.mergeExperimentBranch(
      projectPath, branchName, baseBranch, squash || false
    );

    res.json(success(commitInfo));
  } catch (err) {
    console.error('[experiment] Failed to merge branch:', err);
    res.status(500).json(error(500, 'Failed to merge experiment branch'));
  }
});

/**
 * POST /api/v1/experiments/git/cleanup
 * 清理实验分支
 */
router.post('/git/cleanup', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { projectPath, branchName, baseBranch } = req.body;

    if (!projectPath || !branchName || !baseBranch) {
      res.status(400).json(error(400, 'Missing required: projectPath, branchName, baseBranch'));
      return;
    }

    await gitExperiment.cleanupExperimentBranch(projectPath, branchName, baseBranch);
    res.json(success({ cleaned: true }));
  } catch (err) {
    console.error('[experiment] Failed to cleanup branch:', err);
    res.status(500).json(error(500, 'Failed to cleanup experiment branch'));
  }
});

export default router;

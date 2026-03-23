import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { diffTwoVersions, getCommitsBetween } from '../services/versionDiff.js';
import { getDb } from '../db/sqlite.js';
import path from 'path';
import os from 'os';

const router = Router();

// GET /api/v1/versions/:id/diff — File-level diff for a version against its parent tag
router.get('/:id/diff', (req: Request, res: Response) => {
  const db = getDb();
  const row = db
    .prepare('SELECT id, version, git_tag, projectPath FROM versions WHERE id = ?')
    .get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const projectPath =
    (row.projectPath as string) ||
    path.join(
      process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects',
      req.params.id
    );

  const gitTag = row.git_tag as string | undefined;
  if (!gitTag) {
    res.status(400).json(error(400, 'Version has no git tag for diff'));
    return;
  }

  const previousTag = `v${(row.version as string).replace(/\.\d+$/, '.0')}`;

  try {
    const diffResult = diffTwoVersions(projectPath, previousTag, gitTag);
    res.json(success(diffResult));
  } catch (err) {
    res
      .status(500)
      .json(error(500, `Diff failed: ${err instanceof Error ? err.message : String(err)}`));
  }
});

// GET /api/v1/versions/:id/diff/commits — Get commits between version and its parent
router.get('/:id/diff/commits', (req: Request, res: Response) => {
  const db = getDb();
  const row = db
    .prepare('SELECT id, version, git_tag, projectPath FROM versions WHERE id = ?')
    .get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  const projectPath =
    (row.projectPath as string) ||
    path.join(
      process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects',
      req.params.id
    );

  const gitTag = row.git_tag as string | undefined;
  if (!gitTag) {
    res.status(400).json(error(400, 'Version has no git tag'));
    return;
  }

  const previousTag = `v${(row.version as string).replace(/\.\d+$/, '.0')}`;

  try {
    const commits = getCommitsBetween(projectPath, previousTag, gitTag);
    res.json(success(commits));
  } catch (err) {
    res
      .status(500)
      .json(
        error(500, `Failed to get commits: ${err instanceof Error ? err.message : String(err)}`)
      );
  }
});

export default router;

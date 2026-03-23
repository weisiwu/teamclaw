import { Router, Request, Response } from 'express';
import { success, error } from '../utils/response.js';
import { requireAdmin } from '../middleware/auth.js';
import { getDb } from '../db/sqlite.js';
import { VersionSummaryModel } from '../models/versionSummary.js';
import { ScreenshotModel } from '../models/screenshot.js';
import { generateChangelogFromCommits } from '../services/changelogGenerator.js';
import { onChangelogGenerated } from '../services/changeTracker.js';
import { versionRepo } from '../db/repositories/versionRepo.js';

const router = Router();

// ========== Search Route ==========

// GET /api/v1/versions/search — 高级搜索
router.get('/search', (req: Request, res: Response) => {
  const db = getDb();
  const {
    q,
    status,
    buildStatus,
    branch,
    tag,
    hasScreenshot,
    hasSummary,
    dateFrom,
    dateTo,
    page = '1',
    pageSize = '20',
  } = req.query;

  let sql = 'SELECT * FROM versions WHERE 1=1';
  const params: Record<string, unknown> = {};

  if (q) {
    sql += ' AND (version LIKE @q OR title LIKE @q OR description LIKE @q)';
    params.q = `%${q}%`;
  }
  if (status && status !== 'all') {
    sql += ' AND status = @status';
    params.status = status;
  }
  if (buildStatus && buildStatus !== 'all') {
    sql += ' AND build_status = @buildStatus';
    params.buildStatus = buildStatus;
  }
  if (branch) {
    sql += ' AND branch = @branch';
    params.branch = branch;
  }
  if (dateFrom) {
    sql += ' AND created_at >= @dateFrom';
    params.dateFrom = dateFrom;
  }
  if (dateTo) {
    sql += ' AND created_at <= @dateTo';
    params.dateTo = dateTo;
  }

  sql += ' ORDER BY created_at DESC';

  const allRows = db.prepare(sql).all(params) as Array<Record<string, unknown>>;

  const screenshotIndex = new Map<string, boolean>();
  for (const shot of ScreenshotModel.getAllScreenshots()) {
    screenshotIndex.set(shot.versionId, true);
  }

  const summaryIndex = new Set<string>();
  const summaryRows = db.prepare('SELECT version_id FROM version_summaries').all() as Array<{ version_id: string }>;
  for (const row of summaryRows) {
    summaryIndex.add(row.version_id);
  }

  let filteredRows = allRows;
  if (hasScreenshot === 'true') {
    filteredRows = filteredRows.filter(r => screenshotIndex.get(r.id as string));
  } else if (hasScreenshot === 'false') {
    filteredRows = filteredRows.filter(r => !screenshotIndex.get(r.id as string));
  }
  if (hasSummary === 'true') {
    filteredRows = filteredRows.filter(r => summaryIndex.has(r.id as string));
  } else if (hasSummary === 'false') {
    filteredRows = filteredRows.filter(r => !summaryIndex.has(r.id as string));
  }

  if (tag) {
    const tagRows = db.prepare(
      'SELECT version_id FROM version_tags WHERE tag_name = ?'
    ).all(tag) as Array<{ version_id: string }>;
    const taggedVersionIds = new Set(tagRows.map(r => r.version_id));
    filteredRows = filteredRows.filter(r => taggedVersionIds.has(r.id as string));
  }

  const total = filteredRows.length;
  const p = parseInt(page as string);
  const ps = parseInt(pageSize as string);
  const start = (p - 1) * ps;
  const paginatedRows = filteredRows.slice(start, start + ps);

  const data = paginatedRows.map(row => ({
    id: row.id,
    version: row.version,
    title: row.title,
    description: row.description,
    status: row.status,
    branch: row.branch,
    buildStatus: row.build_status,
    gitTag: (row.git_tag as string) || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    hasScreenshot: !!screenshotIndex.get(row.id as string),
    hasSummary: summaryIndex.has(row.id as string),
  }));

  res.json(success({
    data,
    total,
    page: p,
    pageSize: ps,
    totalPages: Math.ceil(total / ps),
  }));
});

// ========== Timeline Stream Route ==========

// GET /api/v1/versions/:id/timeline/stream — SSE real-time event stream
router.get('/:id/timeline/stream', (req: Request, res: Response) => {
  const { id } = req.params;

  const db = getDb();
  const row = db.prepare('SELECT id, version FROM versions WHERE id = ?').get(id) as { id: string } | undefined;
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', versionId: id, timestamp: new Date().toISOString() })}\n\n`);

  const { subscribe } = require('../services/changeTracker.js');
  let isActive = true;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  heartbeatInterval = setInterval(() => {
    if (isActive && res.writable) {
      res.write(`: heartbeat\n\n`);
    }
  }, 30000);

  const unsubscribe = subscribe(id, ({ versionId, event }: { versionId: string; event: unknown }) => {
    if (isActive && res.writable) {
      res.write(`data: ${JSON.stringify({ type: 'event', versionId, event, timestamp: new Date().toISOString() })}\n\n`);
    }
  });

  req.on('close', () => {
    isActive = false;
    unsubscribe();
    if (heartbeatInterval) clearInterval(heartbeatInterval);
  });
});

// ========== Events Routes ==========

// POST /api/v1/versions/:id/events — Add a manual note to the timeline
router.post('/:id/events', (req: Request, res: Response) => {
  const { id: versionId } = req.params;
  const { note, actor, actorId } = req.body as {
    note: string;
    actor?: string;
    actorId?: string;
  };

  if (!note || typeof note !== 'string') {
    res.status(400).json(error(400, 'note is required and must be a string'));
    return;
  }

  const db = getDb();
  const row = db.prepare('SELECT id FROM versions WHERE id = ?').get(versionId);
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  try {
    const { onManualNote } = require('../services/changeTracker.js');
    const eventId = onManualNote(versionId, note, actor || 'user', actorId);
    res.json(success({ eventId }));
  } catch (err) {
    console.error('[version] Add manual note error:', err);
    res.status(500).json(error(500, 'Failed to add manual_note'));
  }
});

// DELETE /api/v1/versions/:id/events/:eventId — Delete a manual note
router.delete('/:id/events/:eventId', (req: Request, res: Response) => {
  const { id: versionId, eventId } = req.params;
  const db = getDb();

  const event = db.prepare(
    'SELECT id, event_type FROM version_change_events WHERE id = ? AND version_id = ?'
  ).get(eventId, versionId) as { id: string; event_type: string } | undefined;
  if (!event) {
    res.status(404).json(error(404, 'Event not found'));
    return;
  }

  if (event.event_type !== 'manual_note') {
    res.status(403).json(error(403, 'Only manual notes can be deleted'));
    return;
  }

  try {
    db.prepare('DELETE FROM version_change_events WHERE id = ?').run(eventId);
    res.json(success({ eventId }));
  } catch (err) {
    console.error('[version] Delete event error:', err);
    res.status(500).json(error(500, 'Failed to delete event'));
  }
});

// PUT /api/v1/versions/:id/events/:eventId — Update a manual note
router.put('/:id/events/:eventId', (req: Request, res: Response) => {
  const { id: versionId, eventId } = req.params;
  const { note } = req.body as { note: string };
  const db = getDb();

  if (!note || typeof note !== 'string') {
    res.status(400).json(error(400, 'note is required and must be a string'));
    return;
  }

  const event = db.prepare(
    'SELECT id, event_type FROM version_change_events WHERE id = ? AND version_id = ?'
  ).get(eventId, versionId) as { id: string; event_type: string } | undefined;
  if (!event) {
    res.status(404).json(error(404, 'Event not found'));
    return;
  }

  if (event.event_type !== 'manual_note') {
    res.status(403).json(error(403, 'Only manual notes can be edited'));
    return;
  }

  try {
    db.prepare('UPDATE version_change_events SET description = ? WHERE id = ?').run(note, eventId);
    res.json(success({ eventId }));
  } catch (err) {
    console.error('[version] Update event error:', err);
    res.status(500).json(error(500, 'Failed to update manual note'));
  }
});

// ========== Timeline Route ==========

// GET /api/v1/versions/:id/timeline — 获取版本变更时间线
router.get('/:id/timeline', (req: Request, res: Response) => {
  const { id: versionId } = req.params;
  const db = getDb();
  const row = db.prepare('SELECT id, version, created_at FROM versions WHERE id = ?').get(versionId) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }

  try {
    const { getVersionTimeline } = require('../services/changeTracker.js');
    const events = getVersionTimeline(versionId);

    const screenshotIdsInEvents = new Set(
      events.filter((e: { screenshotId?: string }) => e.screenshotId).map((e: { screenshotId: string }) => e.screenshotId)
    );
    const screenshots = ScreenshotModel.findByVersionId(versionId);
    for (const shot of screenshots) {
      if (!screenshotIdsInEvents.has(shot.id)) {
        events.push({
          id: `legacy-screenshot-${shot.id}`,
          type: 'screenshot_linked' as const,
          title: '截图关联',
          description: `${shot.senderName}：${shot.messageContent.substring(0, 50)}...`,
          timestamp: shot.createdAt,
          actor: shot.senderName,
          screenshotId: shot.id,
        });
      }
    }

    const hasVersionCreated = events.some((e: { type: string }) => e.type === 'version_created');
    if (!hasVersionCreated) {
      events.unshift({
        id: `legacy-version-created-${versionId}`,
        type: 'version_created' as const,
        title: '版本创建',
        description: `版本 ${row.version} 已创建`,
        timestamp: row.created_at as string,
        actor: 'system',
      });
    }

    events.sort((a: { timestamp: string }, b: { timestamp: string }) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(success({
      versionId,
      version: row.version,
      events,
    }));
  } catch (err) {
    console.error('[version] Timeline fetch error:', err);
    res.status(500).json(error(500, 'Failed to fetch timeline'));
  }
});

// ========== Summary Routes ==========

// GET /api/v1/versions/:id/summary - Get changelog summary for a version
router.get('/:id/summary', (req: Request, res: Response) => {
  const { id } = req.params;
  const summary = VersionSummaryModel.findByVersionId(id);

  if (!summary) {
    res.status(404).json(error(404, '变更摘要不存在'));
    return;
  }

  res.json(success(summary));
});

// POST /api/v1/versions/:id/summary - Create or update changelog summary
router.post('/:id/summary', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, features, changes, fixes, breaking, createdBy } = req.body as {
      content?: string;
      features?: string[];
      changes?: string[];
      fixes?: string[];
      breaking?: string[];
      createdBy?: string;
    };

    const existing = VersionSummaryModel.findByVersionId(id);
    let summary;

    if (existing) {
      summary = VersionSummaryModel.update(id, { content, features, changes, fixes, breaking });
    } else {
      summary = VersionSummaryModel.create({
        versionId: id,
        content: content || '',
        features: features || [],
        changes: changes || [],
        fixes: fixes || [],
        breaking: breaking || [],
        createdBy: createdBy || 'system',
      });
    }

    res.json(success(summary));
  } catch (err) {
    console.error('Summary save error:', err);
    res.status(500).json(error(500, '变更摘要保存失败'));
  }
});

// PUT /api/v1/versions/:id/summary - Update changelog summary
router.put('/:id/summary', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, features, changes, fixes, breaking } = req.body as {
      content?: string;
      features?: string[];
      changes?: string[];
      fixes?: string[];
      breaking?: string[];
    };

    const existing = VersionSummaryModel.findByVersionId(id);
    if (!existing) {
      res.status(404).json(error(404, '变更摘要不存在'));
      return;
    }

    const summary = VersionSummaryModel.update(id, { content, features, changes, fixes, breaking });
    if (content !== undefined) {
      getDb().prepare('UPDATE versions SET summary = ? WHERE id = ?').run(content, id);
    }
    res.json(success(summary));
  } catch (err) {
    console.error('Summary update error:', err);
    res.status(500).json(error(500, '变更摘要更新失败'));
  }
});

// DELETE /api/v1/versions/:id/summary - Delete changelog summary（仅管理员）
router.delete('/:id/summary', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = VersionSummaryModel.delete(id);
  res.json(success({ deleted }));
});

// POST /api/v1/versions/:id/summary/generate - Generate changelog from commits via AI
router.post('/:id/summary/generate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { commitLog, branchName } = req.body as { commitLog?: string; branchName?: string };

    const generated = await generateChangelogFromCommits(
      id,
      commitLog || 'feat: initial implementation\nfix: bug fixes',
      branchName
    );

    const summary = VersionSummaryModel.upsert({
      versionId: id,
      title: generated.title,
      content: generated.content,
      features: generated.features,
      fixes: generated.fixes,
      changes: generated.improvements,
      breaking: generated.breaking,
      createdBy: 'AI',
    });

    getDb().prepare('UPDATE versions SET summary = ? WHERE id = ?').run(generated.content, id);

    try {
      const entryCount = (generated.features?.length || 0) + (generated.fixes?.length || 0) + (generated.improvements?.length || 0);
      onChangelogGenerated(id, summary.id, entryCount);
    } catch (err) {
      console.warn('[version] Failed to record changelog event:', err);
    }

    res.json(success(summary));
  } catch (err) {
    console.error('Changelog generation error:', err);
    res.status(500).json(error(500, '变更摘要生成失败'));
  }
});

// POST /api/v1/versions/:id/summary/refresh - Re-generate and save summary to Version model
router.post('/:id/summary/refresh', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const row = db.prepare('SELECT id, version FROM versions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) {
      res.status(404).json(error(404, 'Version not found'));
      return;
    }
    const { commitLog, branchName } = req.body as { commitLog?: string; branchName?: string };

    const generated = await generateChangelogFromCommits(
      id,
      commitLog || row.version as string || '',
      branchName
    );

    const summary = VersionSummaryModel.upsert({
      versionId: id,
      title: generated.title,
      content: generated.content,
      features: generated.features,
      fixes: generated.fixes,
      changes: generated.improvements,
      breaking: generated.breaking,
      createdBy: 'AI',
    });

    db.prepare('UPDATE versions SET summary = ? WHERE id = ?').run(generated.content, id);

    res.json(success({
      ...summary,
      versionSummary: generated.content,
      versionSummaryGeneratedAt: new Date().toISOString(),
      versionSummaryGeneratedBy: 'AI',
    }));
  } catch (err) {
    console.error('Summary refresh error:', err);
    res.status(500).json(error(500, '摘要刷新失败'));
  }
});

// GET /api/v1/versions/:id/summary/status — Check if summary exists
router.get('/:id/summary/status', (req: Request, res: Response) => {
  const row = getDb().prepare('SELECT id FROM versions WHERE id = ?').get(req.params.id);
  if (!row) {
    res.status(404).json(error(404, 'Version not found'));
    return;
  }
  const summary = VersionSummaryModel.findByVersionId(req.params.id);
  res.json(success({
    hasSummary: !!summary,
    generatedAt: summary?.generatedAt || null,
    generatedBy: summary?.generatedBy || null,
  }));
});

export default router;

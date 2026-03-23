import { Router } from 'express';
import { success, error } from '../utils/response.js';
import { getDb } from '../db/sqlite.js';
import { getTags, createTag } from '../services/gitService.js';
import { autoCreateTagForVersion } from '../services/tagService.js';
import { getSettings } from '../services/versionSettingsStore.js';
import path from 'path';
import os from 'os';
const router = Router();
function makeTagName(version, prefix, customPrefix) {
    const prefixMap = {
        v: 'v',
        release: 'release/',
        version: 'version/',
    };
    const p = prefix === 'custom' ? (customPrefix || 'v') : prefixMap[prefix];
    return prefix === 'release' || prefix === 'version' ? `${p}${version}` : `${p}${version}`;
}
// GET /api/v1/versions/:id/git-tags — Get git tags
router.get('/:id/git-tags', (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    const tags = getTags(projectPath);
    res.json(success({ data: tags, total: tags.length }));
});
// POST /api/v1/versions/:id/git-tags — Create a git tag for a version
router.post('/:id/git-tags', (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT id, version, projectPath FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const { tagName, message } = req.body;
    const settings = getSettings();
    const name = tagName || makeTagName(row.version, settings.tagPrefix, settings.customPrefix);
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    const { tagExists } = require('../services/gitService.js');
    const created = createTag(projectPath, name, message);
    if (created) {
        db.prepare('UPDATE versions SET tag_created = 1 WHERE id = ?').run(req.params.id);
        autoCreateTagForVersion(req.params.id, row.version, {
            name,
            message,
            createdBy: 'user',
            projectPath,
        });
    }
    res.json(success({ created, tag: name, tagExists: tagExists(projectPath, name) }));
});
// POST /api/v1/versions/:id/create-tag — Manually trigger tag creation for a version
router.post('/:id/create-tag', (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM versions WHERE id = ?').get(req.params.id);
    if (!row) {
        res.status(404).json(error(404, 'Version not found'));
        return;
    }
    const existingTag = row.git_tag;
    if (existingTag) {
        res.status(409).json(error(409, `Version already has a tag: ${existingTag}`));
        return;
    }
    const versionName = row.version;
    const projectPath = row.projectPath ||
        path.join(process.env.TEAMCLAW_PROJECTS_DIR || os.homedir() + '/.openclaw/projects', req.params.id);
    const tagRecord = autoCreateTagForVersion(req.params.id, versionName, {
        projectPath,
        message: `Release ${versionName}`,
        createdBy: 'user',
    });
    if (!tagRecord) {
        res.status(400).json(error(400, 'Tag creation returned null — check if autoTag is enabled in settings'));
        return;
    }
    db.prepare('UPDATE versions SET tag_created = 1, git_tag = ?, git_tag_created_at = ? WHERE id = ?').run(tagRecord.name, tagRecord.createdAt, req.params.id);
    res.status(201).json(success({
        versionId: req.params.id,
        tagName: tagRecord.name,
        tagRecord,
    }));
});
export default router;

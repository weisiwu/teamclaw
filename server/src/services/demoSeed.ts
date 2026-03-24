/**
 * Demo Data Seed Service
 * 服务启动时自动填充 Demo 数据，支持手动重新加载和清除
 */

import { pool } from '../utils/db.js';
import { query, execute, queryOne } from '../utils/db.js';
import { projects } from './importOrchestrator.js';
import fs from 'fs';
import path from 'path';

const DEMO_DATA_DIR = path.join(import.meta.dirname, '../data/demo');
const DEMO_FLAG_KEY = 'demo_data_seeded';
const DEMO_PROJECT_ID = 'demo_teamclaw';

// ============ Demo Project ============

export const DEMO_PROJECT = {
  id: DEMO_PROJECT_ID,
  name: 'TeamClaw',
  source: 'local' as const,
  localPath: process.cwd(),
  techStack: ['TypeScript', 'React', 'Next.js', 'Express', 'PostgreSQL', 'TailwindCSS'],
  buildTool: 'npm',
  hasGit: true,
  importedAt: new Date().toISOString(),
  status: 'active' as const,
};

// ============ JSON Data Loaders ============

function loadDemoTasks() {
  return JSON.parse(fs.readFileSync(path.join(DEMO_DATA_DIR, 'tasks.json'), 'utf-8'));
}

function loadDemoVersions() {
  return JSON.parse(fs.readFileSync(path.join(DEMO_DATA_DIR, 'versions.json'), 'utf-8'));
}

function loadDemoMessages() {
  return JSON.parse(fs.readFileSync(path.join(DEMO_DATA_DIR, 'messages.json'), 'utf-8'));
}

function loadDemoTags() {
  return JSON.parse(fs.readFileSync(path.join(DEMO_DATA_DIR, 'tags.json'), 'utf-8'));
}

// ============ Flag Persistence ============

async function getFlag(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>(
    'SELECT value FROM system_flags WHERE key = $1',
    [key]
  );
  return row?.value ?? null;
}

async function setFlag(key: string, value: string): Promise<void> {
  await execute(
    `INSERT INTO system_flags (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, value]
  );
}

async function deleteFlag(key: string): Promise<void> {
  await execute('DELETE FROM system_flags WHERE key = $1', [key]);
}

// Ensure system_flags table exists
async function ensureSystemFlagsTable(): Promise<void> {
  await execute(`
    CREATE TABLE IF NOT EXISTS system_flags (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// ============ Seed Logic ============

export async function seedDemoData(): Promise<{ seeded: boolean; counts: Record<string, number> }> {
  try {
    await ensureSystemFlagsTable();

    const alreadySeeded = await getFlag(DEMO_FLAG_KEY);
    if (alreadySeeded === 'true') {
      console.log('[demoSeed] Demo data already seeded, skipping.');
      return { seeded: false, counts: {} };
    }

    console.log('[demoSeed] Seeding demo data...');
    const counts: Record<string, number> = {};

    // 1. Add demo project to in-memory map
    projects.set(DEMO_PROJECT.id, DEMO_PROJECT);
    counts.projects = 1;
    console.log('[demoSeed] Project added:', DEMO_PROJECT.name);

    // 2. Seed tags first (tasks reference them)
    counts.tags = await seedDemoTags();

    // 3. Seed tasks
    counts.tasks = await seedDemoTasks();

    // 4. Seed versions
    counts.versions = await seedDemoVersions();

    // 5. Seed messages
    counts.messages = await seedDemoMessages();

    // Mark as seeded
    await setFlag(DEMO_FLAG_KEY, 'true');

    console.log('[demoSeed] Demo data seeded successfully:', counts);
    return { seeded: true, counts };
  } catch (err) {
    console.error('[demoSeed] Failed to seed demo data:', err);
    throw err;
  }
}

async function seedDemoTags(): Promise<number> {
  const tags = loadDemoTags();
  let count = 0;
  for (const tag of tags) {
    try {
      const tagId = `demo_tag_${count + 1}`;
      await execute(
        `INSERT INTO tags (id, name, annotation, source, is_demo)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (name) DO UPDATE SET annotation = $3, is_demo = true`,
        [tagId, tag.name, tag.annotation || '', tag.source || 'manual']
      );
      count++;
    } catch (err) {
      console.warn(`[demoSeed] Failed to insert tag ${tag.name}:`, err);
    }
  }
  console.log(`[demoSeed] Tags seeded: ${count}`);
  return count;
}

async function seedDemoTasks(): Promise<number> {
  const tasks = loadDemoTasks();
  let count = 0;
  for (const task of tasks) {
    try {
      await execute(
        `INSERT INTO tasks (
          task_id, title, description, status, priority,
          assigned_agent, session_id, created_by, tags,
          is_demo, progress, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, NOW(), NOW())
        ON CONFLICT (task_id) DO UPDATE SET
          title = $2, description = $3, status = $4, priority = $5,
          assigned_agent = $6, is_demo = true`,
        [
          task.taskId,
          task.title,
          task.description || '',
          task.status,
          task.priority,
          task.assignedAgent || null,
          task.sessionId,
          task.createdBy,
          task.tags || [],
          task.progress || 0,
        ]
      );
      count++;
    } catch (err) {
      console.warn(`[demoSeed] Failed to insert task ${task.taskId}:`, err);
    }
  }
  console.log(`[demoSeed] Tasks seeded: ${count}`);
  return count;
}

async function seedDemoVersions(): Promise<number> {
  const versions = loadDemoVersions();
  let count = 0;
  for (const ver of versions) {
    try {
      await execute(
        `INSERT INTO versions (
          id, version, tag, branch, summary, title, description,
          commit_hash, git_tag, git_tag_created_at, created_by,
          build_status, tag_created, changes, commits, token_used, is_demo, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true, NOW())
        ON CONFLICT (id) DO UPDATE SET
          version = $2, summary = $5, build_status = $12, is_demo = true`,
        [
          ver.id,
          ver.version,
          ver.tag,
          ver.branch,
          ver.summary,
          ver.title || '',
          ver.description || '',
          ver.commit_hash,
          ver.git_tag || null,
          ver.git_tag_created_at ? new Date(ver.git_tag_created_at) : null,
          ver.created_by,
          ver.build_status,
          ver.tag_created ?? false,
          ver.changes || 0,
          ver.commits || 0,
          ver.token_used || 0,
        ]
      );
      count++;
    } catch (err) {
      console.warn(`[demoSeed] Failed to insert version ${ver.id}:`, err);
    }
  }
  console.log(`[demoSeed] Versions seeded: ${count}`);
  return count;
}

async function seedDemoMessages(): Promise<number> {
  const messages = loadDemoMessages();
  let count = 0;
  for (const msg of messages) {
    try {
      await execute(
        `INSERT INTO messages (
          message_id, queue_id, channel, user_id, user_name,
          role, role_weight, content, type, urgency, priority,
          status, is_demo, created_at, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, $14)
        ON CONFLICT (message_id) DO UPDATE SET is_demo = true`,
        [
          msg.message_id,
          msg.queue_id || null,
          msg.channel,
          msg.user_id,
          msg.user_name,
          msg.role,
          msg.role_weight ?? 3,
          msg.content,
          msg.type || 'text',
          msg.urgency ?? 1,
          msg.priority ?? 5,
          msg.status || 'queued',
          msg.created_at ? new Date(msg.created_at) : new Date(),
          msg.processed_at ? new Date(msg.processed_at) : null,
        ]
      );
      count++;
    } catch (err) {
      console.warn(`[demoSeed] Failed to insert message ${msg.message_id}:`, err);
    }
  }
  console.log(`[demoSeed] Messages seeded: ${count}`);
  return count;
}

// ============ Clear Logic ============

export async function clearDemoData(): Promise<{ cleared: boolean; counts: Record<string, number> }> {
  try {
    console.log('[demoSeed] Clearing demo data...');
    const counts: Record<string, number> = {};

    // Clear from DB (using is_demo flag)
    const taskResult = await execute(
      'DELETE FROM tasks WHERE is_demo = true',
      []
    );
    counts.tasks = taskResult;

    const verResult = await execute(
      'DELETE FROM versions WHERE is_demo = true',
      []
    );
    counts.versions = verResult;

    const msgResult = await execute(
      'DELETE FROM messages WHERE is_demo = true',
      []
    );
    counts.messages = msgResult;

    const tagResult = await execute(
      'DELETE FROM tags WHERE is_demo = true',
      []
    );
    counts.tags = tagResult;

    // Remove from in-memory project map
    projects.delete(DEMO_PROJECT_ID);
    counts.projects = 1;

    // Remove flag
    await deleteFlag(DEMO_FLAG_KEY);

    console.log('[demoSeed] Demo data cleared:', counts);
    return { cleared: true, counts };
  } catch (err) {
    console.error('[demoSeed] Failed to clear demo data:', err);
    throw err;
  }
}

// ============ Status ============

export async function getDemoStatus(): Promise<{
  seeded: boolean;
  counts: Record<string, number>;
}> {
  try {
    await ensureSystemFlagsTable();
    const flag = await getFlag(DEMO_FLAG_KEY);
    const seeded = flag === 'true';

    const counts: Record<string, number> = {};
    if (seeded) {
      const [taskRows, verRows, msgRows, tagRows] = await Promise.all([
        query<{ count: string }>('SELECT COUNT(*) as count FROM tasks WHERE is_demo = true'),
        query<{ count: string }>('SELECT COUNT(*) as count FROM versions WHERE is_demo = true'),
        query<{ count: string }>('SELECT COUNT(*) as count FROM messages WHERE is_demo = true'),
        query<{ count: string }>('SELECT COUNT(*) as count FROM tags WHERE is_demo = true'),
      ]);
      counts.tasks = parseInt(taskRows[0]?.count ?? '0', 10);
      counts.versions = parseInt(verRows[0]?.count ?? '0', 10);
      counts.messages = parseInt(msgRows[0]?.count ?? '0', 10);
      counts.tags = parseInt(tagRows[0]?.count ?? '0', 10);
      counts.projects = 1;
    }

    return { seeded, counts };
  } catch (err) {
    console.error('[demoSeed] Failed to get demo status:', err);
    return { seeded: false, counts: {} };
  }
}

/**
 * BuildRecord Model — In-memory + JSON file persistence
 * Tracks build history per version with full output logs
 */

export type BuildRecordStatus = 'pending' | 'building' | 'success' | 'failed' | 'cancelled';
export type BuildTriggerType = 'manual' | 'auto' | 'rebuild';

export interface BuildRecord {
  id: string;                    // br_xxx
  versionId: string;
  versionName: string;
  versionNumber: string;         // semantic version string

  // Build config used
  buildCommand?: string;         // custom build command (null = use default)
  projectPath?: string;          // explicit project path
  projectType?: 'nextjs' | 'node' | 'react' | 'unknown';

  // Timing
  status: BuildRecordStatus;
  queuedAt: string;             // when build was queued
  startedAt?: string;            // when build actually started
  completedAt?: string;          // when build finished
  duration?: number;             // milliseconds

  // Results
  exitCode?: number;
  command?: string;              // actual command executed
  output?: string;               // stdout (last 100KB)
  errorOutput?: string;          // stderr (last 50KB)

  // Artifacts
  artifactCount?: number;
  artifactPaths?: string[];      // relative paths of produced artifacts
  artifactUrl?: string;

  // Metadata
  triggeredBy: string;           // userId or 'system'
  triggerType: BuildTriggerType; // how this build was triggered
  buildNumber: number;           // sequential build number for this version (1, 2, 3...)
  parentBuildId?: string;       // if rebuild, reference to original build

  // Rollback
  rollbackCount: number;         // how many times this build has been rolled back to
  lastRollbackAt?: string;       // ISO timestamp of last rollback
  lastRollbackCommit?: string;   // the commit we rolled back to
  rollbackFromCommit?: string;   // the commit we rolled back from (before rollback)

  import { generateId } from '../utils/generateId.js';

// Package
  packagePath?: string;          // absolute path to the created package
  packageUrl?: string;           // URL path to download the package
  packageFormat?: 'zip' | 'tar.gz' | 'tar';
  packageSize?: number;          // bytes
  packageCreatedAt?: string;     // ISO timestamp
}

const buildRecords = new Map<string, BuildRecord>();
const indexByVersion = new Map<string, string[]>(); // versionId -> [buildId, ...]
let nextBuildNumberByVersion = new Map<string, number>();

function persist() {
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'build_records.json'),
      JSON.stringify({
        records: Array.from(buildRecords.values()),
        index: Object.fromEntries(indexByVersion),
        buildNumbers: Object.fromEntries(nextBuildNumberByVersion),
      })
    );
  } catch {
    // Ignore
  }
}

function load() {
  try {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(process.cwd(), 'data', 'build_records.json');
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      for (const r of data.records) {
        buildRecords.set(r.id, r);
      }
      for (const [k, v] of Object.entries(data.index)) {
        indexByVersion.set(k, v);
      }
      for (const [k, v] of Object.entries(data.buildNumbers)) {
        nextBuildNumberByVersion.set(k, v);
      }
    }
  } catch {
    // Start fresh
  }
}

load();

// ========== CRUD ==========

export function createBuildRecord(data: Omit<BuildRecord, 'id' | 'buildNumber' | 'queuedAt' | 'status'>): BuildRecord {
  const id = generateId('br');

  // Get next build number for this version
  const currentNum = nextBuildNumberByVersion.get(data.versionId) || 1;
  const buildNumber = currentNum;
  nextBuildNumberByVersion.set(data.versionId, currentNum + 1);

  const record: BuildRecord = {
    ...data,
    id,
    buildNumber,
    queuedAt: new Date().toISOString(),
    status: 'pending',
    rollbackCount: 0,
  };

  buildRecords.set(id, record);

  const versionIndex = indexByVersion.get(data.versionId) || [];
  versionIndex.push(id);
  indexByVersion.set(data.versionId, versionIndex);

  persist();
  return record;
}

export function getBuildRecord(id: string): BuildRecord | undefined {
  return buildRecords.get(id);
}

export function getBuildRecordsByVersion(versionId: string, limit = 20): BuildRecord[] {
  const ids = indexByVersion.get(versionId) || [];
  return ids
    .slice(-limit)
    .reverse()
    .map(id => buildRecords.get(id)!)
    .filter(Boolean);
}

export function getLatestBuildRecord(versionId: string): BuildRecord | undefined {
  const ids = indexByVersion.get(versionId) || [];
  if (ids.length === 0) return undefined;
  const latestId = ids[ids.length - 1];
  return buildRecords.get(latestId);
}

export function updateBuildRecord(id: string, updates: Partial<BuildRecord>): BuildRecord | undefined {
  const existing = buildRecords.get(id);
  if (!existing) return undefined;

  const updated = { ...existing, ...updates };
  buildRecords.set(id, updated);
  persist();
  return updated;
}

export function getBuildRecordStats(versionId?: string): {
  total: number;
  success: number;
  failed: number;
  building: number;
  averageDuration?: number;
} {
  const records = versionId
    ? getBuildRecordsByVersion(versionId, 1000)
    : Array.from(buildRecords.values());

  const success = records.filter(r => r.status === 'success').length;
  const failed = records.filter(r => r.status === 'failed').length;
  const building = records.filter(r => r.status === 'building').length;

  const durations = records
    .filter(r => r.status === 'success' && r.duration)
    .map(r => r.duration!);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : undefined;

  return {
    total: records.length,
    success,
    failed,
    building,
    averageDuration: avgDuration,
  };
}

export function cancelBuildRecord(id: string): BuildRecord | undefined {
  return updateBuildRecord(id, { status: 'cancelled', completedAt: new Date().toISOString() });
}

/**
 * BuildRecord Model — In-memory + JSON file persistence
 * Tracks build history per version with full output logs
 */
const buildRecords = new Map();
const indexByVersion = new Map(); // versionId -> [buildId, ...]
let nextBuildNumberByVersion = new Map();
function persist() {
    try {
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir))
            fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, 'build_records.json'), JSON.stringify({
            records: Array.from(buildRecords.values()),
            index: Object.fromEntries(indexByVersion),
            buildNumbers: Object.fromEntries(nextBuildNumberByVersion),
        }));
    }
    catch {
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
    }
    catch {
        // Start fresh
    }
}
load();
// ========== CRUD ==========
export function createBuildRecord(data) {
    const id = `br_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    // Get next build number for this version
    const currentNum = nextBuildNumberByVersion.get(data.versionId) || 1;
    const buildNumber = currentNum;
    nextBuildNumberByVersion.set(data.versionId, currentNum + 1);
    const record = {
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
export function getBuildRecord(id) {
    return buildRecords.get(id);
}
export function getBuildRecordsByVersion(versionId, limit = 20) {
    const ids = indexByVersion.get(versionId) || [];
    return ids
        .slice(-limit)
        .reverse()
        .map(id => buildRecords.get(id))
        .filter(Boolean);
}
export function getLatestBuildRecord(versionId) {
    const ids = indexByVersion.get(versionId) || [];
    if (ids.length === 0)
        return undefined;
    const latestId = ids[ids.length - 1];
    return buildRecords.get(latestId);
}
export function updateBuildRecord(id, updates) {
    const existing = buildRecords.get(id);
    if (!existing)
        return undefined;
    const updated = { ...existing, ...updates };
    buildRecords.set(id, updated);
    persist();
    return updated;
}
export function getBuildRecordStats(versionId) {
    const records = versionId
        ? getBuildRecordsByVersion(versionId, 1000)
        : Array.from(buildRecords.values());
    const success = records.filter(r => r.status === 'success').length;
    const failed = records.filter(r => r.status === 'failed').length;
    const building = records.filter(r => r.status === 'building').length;
    const durations = records
        .filter(r => r.status === 'success' && r.duration)
        .map(r => r.duration);
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
export function cancelBuildRecord(id) {
    return updateBuildRecord(id, { status: 'cancelled', completedAt: new Date().toISOString() });
}

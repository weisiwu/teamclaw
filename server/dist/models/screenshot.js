/**
 * Screenshot Model — In-memory storage + JSON file persistence
 */
// In-memory store
const screenshots = new Map();
const indexByVersion = new Map(); // versionId -> screenshotId[]
function persist() {
    // Simple JSON file persistence
    try {
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir))
            fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, 'screenshots.json'), JSON.stringify(Array.from(screenshots.values())));
    }
    catch {
        // Ignore persistence errors
    }
}
function load() {
    try {
        const fs = require('fs');
        const path = require('path');
        const file = path.join(process.cwd(), 'data', 'screenshots.json');
        if (fs.existsSync(file)) {
            const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
            data.forEach(s => {
                screenshots.set(s.id, s);
                const ids = indexByVersion.get(s.versionId) || [];
                if (!ids.includes(s.id))
                    ids.push(s.id);
                indexByVersion.set(s.versionId, ids);
            });
        }
    }
    catch {
        // Start fresh if load fails
    }
}
// Load on module init
load();
export const ScreenshotModel = {
    create(data) {
        const id = `scr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const screenshot = {
            ...data,
            id,
            createdAt: new Date().toISOString(),
        };
        screenshots.set(id, screenshot);
        const ids = indexByVersion.get(data.versionId) || [];
        ids.push(id);
        indexByVersion.set(data.versionId, ids);
        persist();
        return screenshot;
    },
    findById(id) {
        return screenshots.get(id);
    },
    findByVersionId(versionId) {
        const ids = indexByVersion.get(versionId) || [];
        return ids.map(id => screenshots.get(id)).filter(Boolean);
    },
    update(id, data) {
        const existing = screenshots.get(id);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...data };
        screenshots.set(id, updated);
        persist();
        return updated;
    },
    delete(id) {
        const screenshot = screenshots.get(id);
        if (!screenshot)
            return false;
        screenshots.delete(id);
        const ids = indexByVersion.get(screenshot.versionId) || [];
        indexByVersion.set(screenshot.versionId, ids.filter(i => i !== id));
        persist();
        return true;
    },
    deleteByVersionId(versionId) {
        const ids = indexByVersion.get(versionId) || [];
        let count = 0;
        ids.forEach(id => {
            screenshots.delete(id);
            count++;
        });
        indexByVersion.delete(versionId);
        persist();
        return count;
    },
    getAllScreenshots() {
        return Array.from(screenshots.values());
    },
};

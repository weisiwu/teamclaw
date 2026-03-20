import * as fs from 'fs';
class DocVersionService {
    versions = new Map();
    versionCounter = new Map();
    getVersionsDir() {
        const dir = process.env.DOCS_VERSIONS_DIR || '/tmp/teamclaw/docs-versions';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }
    /**
     * 保存文档快照
     */
    saveVersion(docId, content, createdBy = 'system', note) {
        const dir = this.getVersionsDir();
        const counter = (this.versionCounter.get(docId) || 0) + 1;
        this.versionCounter.set(docId, counter);
        const versionId = `v-${docId}-${counter}`;
        const versionDir = `${dir}/${docId}`;
        if (!fs.existsSync(versionDir)) {
            fs.mkdirSync(versionDir, { recursive: true });
        }
        const snapshotPath = `${versionDir}/${versionId}.bin`;
        fs.writeFileSync(snapshotPath, content);
        const version = {
            versionId,
            docId,
            versionNumber: counter,
            size: content.length,
            createdAt: new Date().toISOString(),
            createdBy,
            snapshotPath,
            note,
        };
        const existing = this.versions.get(docId) || [];
        existing.push(version);
        this.versions.set(docId, existing);
        return version;
    }
    /**
     * 获取文档所有版本
     */
    getVersions(docId) {
        return this.versions.get(docId) || [];
    }
    /**
     * 获取指定版本内容
     */
    getVersionContent(docId, versionId) {
        const versions = this.versions.get(docId) || [];
        const version = versions.find(v => v.versionId === versionId);
        if (!version)
            return null;
        try {
            return fs.readFileSync(version.snapshotPath);
        }
        catch {
            return null;
        }
    }
    /**
     * 获取文档版本数量
     */
    getVersionCount(docId) {
        return (this.versions.get(docId) || []).length;
    }
    /**
     * 删除文档所有版本
     */
    deleteAllVersions(docId) {
        this.versions.delete(docId);
        this.versionCounter.delete(docId);
        const dir = `${this.getVersionsDir()}/${docId}`;
        try {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true });
            }
        }
        catch { /* ignore */ }
    }
    /**
     * 获取版本列表（分页）
     */
    getVersionsPaged(docId, page = 1, pageSize = 10) {
        const all = this.versions.get(docId) || [];
        const reversed = [...all].reverse(); // 最新版本在前
        const total = reversed.length;
        const paged = reversed.slice((page - 1) * pageSize, page * pageSize);
        return { list: paged, total };
    }
}
export const docVersionService = new DocVersionService();

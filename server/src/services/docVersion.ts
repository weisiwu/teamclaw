import * as fs from 'fs';

/**
 * 文档版本管理服务
 * 每次文档上传/更新时保存快照，支持历史版本浏览和恢复
 */

export interface DocVersion {
  versionId: string;
  docId: string;
  versionNumber: number;
  size: number;
  createdAt: string;
  createdBy: string;
  snapshotPath: string;
  note?: string;
}

export interface DocVersionMap {
  [docId: string]: DocVersion[];
}

class DocVersionService {
  private versions: Map<string, DocVersion[]> = new Map();
  private versionCounter: Map<string, number> = new Map();

  private getVersionsDir(): string {
    const dir = process.env.DOCS_VERSIONS_DIR || '/tmp/teamclaw/docs-versions';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * 保存文档快照
   */
  saveVersion(docId: string, content: Buffer, createdBy: string = 'system', note?: string): DocVersion {
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

    const version: DocVersion = {
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
  getVersions(docId: string): DocVersion[] {
    return this.versions.get(docId) || [];
  }

  /**
   * 获取指定版本内容
   */
  getVersionContent(docId: string, versionId: string): Buffer | null {
    const versions = this.versions.get(docId) || [];
    const version = versions.find(v => v.versionId === versionId);
    if (!version) return null;
    try {
      return fs.readFileSync(version.snapshotPath);
    } catch {
      return null;
    }
  }

  /**
   * 获取文档版本数量
   */
  getVersionCount(docId: string): number {
    return (this.versions.get(docId) || []).length;
  }

  /**
   * 删除文档所有版本
   */
  deleteAllVersions(docId: string): void {
    this.versions.delete(docId);
    this.versionCounter.delete(docId);
    const dir = `${this.getVersionsDir()}/${docId}`;
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true });
      }
    } catch { /* ignore */ }
  }

  /**
   * 获取版本列表（分页）
   */
  getVersionsPaged(docId: string, page: number = 1, pageSize: number = 10): { list: DocVersion[]; total: number } {
    const all = this.versions.get(docId) || [];
    const reversed = [...all].reverse(); // 最新版本在前
    const total = reversed.length;
    const paged = reversed.slice((page - 1) * pageSize, page * pageSize);
    return { list: paged, total };
  }
}

export const docVersionService = new DocVersionService();

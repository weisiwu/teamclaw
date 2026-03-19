// Screenshot data model for version tracking
export interface VersionScreenshot {
  id: string;
  versionId: string;
  messageId?: string;
  messageContent?: string;
  senderName?: string;
  senderAvatar?: string;
  screenshotUrl: string;
  thumbnailUrl?: string;
  branchName?: string;
  createdAt: string;
}

// In-memory storage
const screenshots = new Map<string, VersionScreenshot>();

// Sample data
const sampleScreenshots: VersionScreenshot[] = [
  {
    id: 'ss-001',
    versionId: 'v1',
    messageContent: '确认发布 v1.0.0 版本',
    senderName: '张三',
    screenshotUrl: '/screenshots/v1/ss-001.png',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'ss-002',
    versionId: 'v2',
    messageContent: '新增用户管理功能确认',
    senderName: '李四',
    screenshotUrl: '/screenshots/v2/ss-002.png',
    createdAt: '2026-03-10T14:00:00Z',
  },
];

sampleScreenshots.forEach(s => screenshots.set(s.id, s));

export const ScreenshotModel = {
  findAll(): VersionScreenshot[] {
    return Array.from(screenshots.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  findByVersionId(versionId: string): VersionScreenshot[] {
    return Array.from(screenshots.values())
      .filter(s => s.versionId === versionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  findById(id: string): VersionScreenshot | undefined {
    return screenshots.get(id);
  },

  create(data: Omit<VersionScreenshot, 'id' | 'createdAt'>): VersionScreenshot {
    const id = `ss-${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const screenshot: VersionScreenshot = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    screenshots.set(id, screenshot);
    return screenshot;
  },

  delete(id: string): boolean {
    return screenshots.delete(id);
  },

  deleteByVersionId(versionId: string): number {
    let count = 0;
    for (const [id, s] of screenshots) {
      if (s.versionId === versionId) {
        screenshots.delete(id);
        count++;
      }
    }
    return count;
  },
};

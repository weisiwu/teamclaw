# 搜索与截图模型

> 来源文件：`server/src/models/search.ts`, `server/src/models/screenshot.ts`

## SearchFilter 搜索过滤器

```typescript
export interface SearchFilter {
  type?: string; // 文档类型：md, pdf, txt, code, image
  dateFrom?: string; // ISO 日期字符串
  dateTo?: string; // ISO 日期字符串
  projectId?: string; // 项目 ID 过滤
  sizeMin?: number; // 最小文件大小（字节）
  sizeMax?: number; // 最大文件大小（字节）
}
```

## SearchHistoryRecord 搜索历史

```typescript
export interface SearchHistoryRecord {
  id: string;
  userId: string;
  query: string;
  type: 'keyword' | 'semantic';
  filters?: SearchFilter;
  resultCount: number;
  createdAt: string;
}
```

### 搜索类型

| 类型       | 说明                 |
| ---------- | -------------------- |
| `keyword`  | 关键词搜索           |
| `semantic` | 语义搜索（向量检索） |

## EnhancedSearchResult 增强搜索结果

```typescript
export interface EnhancedSearchResult {
  type: 'doc' | 'task' | 'version';
  id: string;
  title: string;
  snippet: string;
  url: string;
  score: number;
  metadata?: Record<string, string | number | boolean>;
}
```

### 搜索结果类型

| 类型      | 说明 |
| --------- | ---- |
| `doc`     | 文档 |
| `task`    | 任务 |
| `version` | 版本 |

## Screenshot 模型

截图数据（PostgreSQL 持久化）。

```typescript
export interface Screenshot {
  id: string;
  versionId: string;
  messageId?: string;
  messageContent?: string;
  senderName?: string;
  senderAvatar?: string;
  screenshotUrl: string;
  thumbnailUrl?: string;
  branchName?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  createdBy?: string;
}
```

### ScreenshotModel API

```typescript
export const ScreenshotModel = {
  async create(data: Omit<Screenshot, 'id' | 'createdAt'>): Promise<Screenshot>,
  async findById(id: string): Promise<Screenshot | undefined>,
  async findByVersionId(versionId: string): Promise<Screenshot[]>,
  async update(id: string, data: Partial<Screenshot>): Promise<Screenshot | undefined>,
  async delete(id: string): Promise<boolean>,
  async deleteByVersionId(versionId: string): Promise<number>,
  async getAllScreenshots(): Promise<Screenshot[]>,
};
```

### 数据库表结构

```sql
CREATE TABLE screenshots (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  message_id TEXT,
  message_content TEXT,
  sender_name TEXT,
  sender_avatar TEXT,
  screenshot_url TEXT NOT NULL,
  thumbnail_url TEXT,
  branch_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  created_by TEXT
);

CREATE INDEX idx_screenshots_version_id ON screenshots(version_id);
CREATE INDEX idx_screenshots_created_at ON screenshots(created_at DESC);
```

## 数据库表（PostgreSQL）

### screenshots 表

| 列名              | 类型        | 说明             |
| ----------------- | ----------- | ---------------- |
| `id`              | TEXT        | 主键             |
| `version_id`      | TEXT        | 关联版本 ID      |
| `message_id`      | TEXT        | 来源消息 ID      |
| `message_content` | TEXT        | 消息内容         |
| `sender_name`     | TEXT        | 发送者名称       |
| `sender_avatar`   | TEXT        | 发送者头像       |
| `screenshot_url`  | TEXT        | 截图 URL         |
| `thumbnail_url`   | TEXT        | 缩略图 URL       |
| `branch_name`     | TEXT        | 分支名称         |
| `file_size`       | INTEGER     | 文件大小（字节） |
| `mime_type`       | TEXT        | MIME 类型        |
| `created_at`      | TIMESTAMPTZ | 创建时间         |
| `created_by`      | TEXT        | 创建者           |

### version_summaries 表

```sql
CREATE TABLE version_summaries (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  title TEXT,
  content TEXT,
  features JSONB DEFAULT '[]',
  fixes JSONB DEFAULT '[]',
  changes JSONB DEFAULT '[]',
  breaking JSONB DEFAULT '[]',
  changes_detail JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL,
  generated_by TEXT,
  branch_name TEXT
);

CREATE INDEX idx_version_summaries_version_id ON version_summaries(version_id);
CREATE UNIQUE INDEX idx_version_summaries_version_id_unique ON version_summaries(version_id);
```

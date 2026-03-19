# Issue #188 - 迭代 87：变更追踪 - 技术方案设计

> **任务来源**: Issue #188  
> **方向**: 变更追踪 - 版本关联消息截图、变更摘要  
> **评审结论**: APPROVED

---

## 1. 需求概述

当版本相关事件发生时，自动/手动关联消息截图和变更摘要，形成完整的版本变更记录。

### 1.1 事件类型

| 事件 | 说明 | 截图需求 | 摘要需求 |
|------|------|----------|----------|
| version_created | 版本创建 | 可选 | 自动 |
| version_published | 版本发布 | 必须 | 自动 |
| version_rollback | 版本回退 | 可选 | 必须 |
| screenshot_linked | 截图关联 | 必须 | - |
| changelog_generated | 变更摘要生成 | - | 必须 |
| bump_executed | 版本升级 | 可选 | 自动 |

### 1.2 已有基础设施

| 模块 | 文件 | 状态 |
|------|------|------|
| 截图模型 | `server/src/models/screenshot.ts` | ✅ 内存存储 |
| 截图 API | `version.ts` 1030-1095 行 | ✅ CRUD 完整 |
| Changelog 生成 | `server/src/services/changelogGenerator.ts` | ✅ AI 调用 |
| 版本 Changelog | `VersionChangelog` 类型 | ✅ 已定义 |
| 时间线事件 | `TimelineEvent` 类型 | ✅ 已定义 |
| 前端组件 | `VersionChangeLogPanel.tsx` | ✅ 已存在 |

---

## 2. 技术方案

### 2.1 核心设计

```
┌─────────────────────────────────────────────────────────────────┐
│                     变更追踪系统架构                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ 事件触发器    │───→│ 变更记录器    │───→│ 时间线存储    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │               │
│         ↓                   ↓                   ↓               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ 消息截图服务  │    │ 摘要生成服务  │    │ 前端时间线    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 数据模型扩展

#### 新增：version_change_events 表

```sql
-- 版本变更事件表 - 记录所有版本相关变更
CREATE TABLE IF NOT EXISTS version_change_events (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'version_created',      -- 版本创建
    'version_published',    -- 版本发布
    'version_rollback',     -- 版本回退
    'version_archived',     -- 版本归档
    'screenshot_linked',    -- 截图关联
    'screenshot_removed',   -- 截图移除
    'changelog_generated',  -- 变更摘要生成
    'changelog_updated',    -- 变更摘要更新
    'bump_executed',        -- 版本升级
    'tag_created',          -- Tag 创建
    'build_triggered',      -- 构建触发
    'build_completed',      -- 构建完成
    'manual_note'           -- 手动备注
  )),
  title TEXT NOT NULL,           -- 事件标题
  description TEXT,              -- 事件描述
  actor TEXT DEFAULT 'system',   -- 执行者
  actor_id TEXT,                 -- 执行者 ID
  
  -- 关联数据
  screenshot_id TEXT,            -- 关联截图 ID（可选）
  changelog_id TEXT,             -- 关联变更摘要 ID（可选）
  build_id TEXT,                 -- 关联构建 ID（可选）
  task_id TEXT,                  -- 关联任务 ID（可选）
  metadata TEXT,                 -- JSON 扩展字段
  
  -- 时间戳
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE,
  FOREIGN KEY (screenshot_id) REFERENCES screenshots(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_version_events_version ON version_change_events(version_id, created_at DESC);
CREATE INDEX idx_version_events_type ON version_change_events(event_type, created_at DESC);
CREATE INDEX idx_version_events_actor ON version_change_events(actor_id, created_at DESC);
```

#### 扩展：screenshots 表（改为持久化）

```sql
-- 截图表改为 SQLite 持久化
CREATE TABLE IF NOT EXISTS screenshots (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  message_id TEXT,               -- 消息 ID（飞书/钉钉等）
  message_content TEXT,          -- 消息内容
  sender_name TEXT,              -- 发送者
  sender_avatar TEXT,            -- 发送者头像
  screenshot_url TEXT NOT NULL,  -- 截图 URL
  thumbnail_url TEXT,            -- 缩略图 URL
  branch_name TEXT,              -- 关联分支
  file_size INTEGER,             -- 文件大小
  mime_type TEXT,                -- 文件类型
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT 'system',
  
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
);

CREATE INDEX idx_screenshots_version ON screenshots(version_id, created_at DESC);
CREATE INDEX idx_screenshots_message ON screenshots(message_id);
```

#### 新增：version_changelog_entries 表

```sql
-- 版本变更摘要详细记录
CREATE TABLE IF NOT EXISTS version_changelog_entries (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  event_id TEXT,                 -- 关联事件 ID
  
  -- 分类变更
  features TEXT,                 -- JSON 数组：新功能
  fixes TEXT,                    -- JSON 数组：修复
  improvements TEXT,             -- JSON 数组：改进
  breaking TEXT,                 -- JSON 数组：破坏性变更
  docs TEXT,                     -- JSON 数组：文档更新
  
  -- 原始数据
  raw_commits TEXT,              -- JSON 数组：原始 commits
  generated_by TEXT DEFAULT 'ai', -- 生成方式：ai / manual / system
  
  created_at TEXT DEFAULT (datetime('now')),
  
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES version_change_events(id) ON DELETE SET NULL
);
```

---

## 3. API 设计

### 3.1 新增端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `GET /api/v1/versions/:id/timeline` | GET | 获取版本时间线（整合所有事件） |
| `POST /api/v1/versions/:id/events` | POST | 手动添加事件记录 |
| `DELETE /api/v1/versions/:id/events/:eventId` | DELETE | 删除事件记录 |
| `POST /api/v1/versions/:id/changelog/refresh` | POST | 重新生成分摘要 |
| `PUT /api/v1/versions/:id/changelog` | PUT | 手动编辑变更摘要 |

### 3.2 API 详情

#### GET /api/v1/versions/:id/timeline

**响应格式**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "versionId": "v1",
    "version": "1.0.0",
    "events": [
      {
        "id": "evt_123",
        "type": "version_created",
        "title": "版本创建",
        "description": "创建版本 1.0.0",
        "actor": "developer",
        "timestamp": "2026-03-20T10:00:00Z",
        "metadata": {}
      },
      {
        "id": "evt_124",
        "type": "screenshot_linked",
        "title": "关联消息截图",
        "description": "关联飞书消息截图",
        "actor": "system",
        "timestamp": "2026-03-20T10:05:00Z",
        "screenshotId": "scr_456",
        "screenshot": {
          "id": "scr_456",
          "url": "/screenshots/v1/msg_123.png",
          "thumbnailUrl": "/screenshots/v1/msg_123_thumb.png",
          "messageContent": "确认发布版本",
          "senderName": "产品经理"
        }
      },
      {
        "id": "evt_125",
        "type": "changelog_generated",
        "title": "变更摘要生成",
        "description": "基于 5 个 commits 生成",
        "actor": "ai",
        "timestamp": "2026-03-20T10:06:00Z",
        "changelog": {
          "features": ["新增登录功能"],
          "fixes": ["修复崩溃问题"]
        }
      },
      {
        "id": "evt_126",
        "type": "version_published",
        "title": "版本发布",
        "description": "版本 1.0.0 正式发布",
        "actor": "developer",
        "timestamp": "2026-03-20T10:10:00Z"
      }
    ]
  }
}
```

#### POST /api/v1/versions/:id/events

**请求体**:
```json
{
  "type": "manual_note",
  "title": "发布前检查",
  "description": "已完成回归测试",
  "screenshotUrl": "https://example.com/test.png"
}
```

---

## 4. 文件变更清单

### 4.1 后端（7 个文件）

| 文件路径 | 变更类型 | 变更内容 |
|---------|---------|----------|
| `server/src/db/migrations/xxx_add_version_change_events.sql` | **新增** | 创建 version_change_events 表 |
| `server/src/db/migrations/xxx_migrate_screenshots_to_sqlite.sql` | **新增** | 迁移 screenshots 到 SQLite |
| `server/src/db/migrations/xxx_add_changelog_entries.sql` | **新增** | 创建 version_changelog_entries 表 |
| `server/src/models/versionChangeEvent.ts` | **新增** | 变更事件模型（CRUD） |
| `server/src/models/screenshot.ts` | **重写** | 改为 SQLite 持久化 |
| `server/src/services/changeTracker.ts` | **新增** | 变更追踪核心服务 |
| `server/src/routes/version.ts` | 修改 | 新增 timeline/events/changelog 端点 |

### 4.2 前端（4 个文件）

| 文件路径 | 变更类型 | 变更内容 |
|---------|---------|----------|
| `lib/api/types.ts` | 修改 | 扩展 TimelineEvent, 新增 ChangeEvent 类型 |
| `lib/api/versions.ts` | 修改 | 新增 getVersionTimeline, addChangeEvent 等 hooks |
| `components/versions/VersionTimeline.tsx` | **新增** | 统一时间线展示组件 |
| `components/versions/VersionChangeLogPanel.tsx` | 修改 | 整合新的时间线 API |

---

## 5. 核心实现逻辑

### 5.1 变更追踪服务 (changeTracker.ts)

```typescript
// server/src/services/changeTracker.ts

import { getDb } from '../db/sqlite.js';

export type ChangeEventType = 
  | 'version_created'
  | 'version_published'
  | 'version_rollback'
  | 'screenshot_linked'
  | 'changelog_generated'
  | 'bump_executed'
  | 'manual_note';

export interface ChangeEventData {
  versionId: string;
  type: ChangeEventType;
  title: string;
  description?: string;
  actor?: string;
  actorId?: string;
  screenshotId?: string;
  changelogId?: string;
  buildId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 记录变更事件
 */
export function recordChangeEvent(data: ChangeEventData): string {
  const db = getDb();
  const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  
  db.prepare(`
    INSERT INTO version_change_events (
      id, version_id, event_type, title, description,
      actor, actor_id, screenshot_id, changelog_id, build_id, task_id, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.versionId,
    data.type,
    data.title,
    data.description || null,
    data.actor || 'system',
    data.actorId || null,
    data.screenshotId || null,
    data.changelogId || null,
    data.buildId || null,
    data.taskId || null,
    data.metadata ? JSON.stringify(data.metadata) : null
  );
  
  return id;
}

/**
 * 获取版本时间线
 */
export function getVersionTimeline(versionId: string) {
  const db = getDb();
  
  const events = db.prepare(`
    SELECT e.*, s.screenshot_url, s.message_content, s.sender_name,
           c.features, c.fixes, c.improvements, c.breaking, c.docs
    FROM version_change_events e
    LEFT JOIN screenshots s ON e.screenshot_id = s.id
    LEFT JOIN version_changelog_entries c ON e.changelog_id = c.id
    WHERE e.version_id = ?
    ORDER BY e.created_at DESC
  `).all(versionId);
  
  return events.map(row => ({
    id: row.id,
    type: row.event_type,
    title: row.title,
    description: row.description,
    actor: row.actor,
    timestamp: row.created_at,
    screenshot: row.screenshot_id ? {
      id: row.screenshot_id,
      url: row.screenshot_url,
      messageContent: row.message_content,
      senderName: row.sender_name,
    } : undefined,
    changelog: row.changelog_id ? {
      features: row.features ? JSON.parse(row.features) : [],
      fixes: row.fixes ? JSON.parse(row.fixes) : [],
      improvements: row.improvements ? JSON.parse(row.improvements) : [],
      breaking: row.breaking ? JSON.parse(row.breaking) : [],
      docs: row.docs ? JSON.parse(row.docs) : [],
    } : undefined,
  }));
}

/**
 * Hook: 版本创建时自动记录
 */
export function onVersionCreated(versionId: string, actor: string) {
  return recordChangeEvent({
    versionId,
    type: 'version_created',
    title: '版本创建',
    description: `版本已创建`,
    actor,
  });
}

/**
 * Hook: 截图关联时记录
 */
export function onScreenshotLinked(versionId: string, screenshotId: string, actor: string) {
  return recordChangeEvent({
    versionId,
    type: 'screenshot_linked',
    title: '关联消息截图',
    description: '关联消息截图记录',
    actor,
    screenshotId,
  });
}

/**
 * Hook: Changelog 生成时记录
 */
export function onChangelogGenerated(versionId: string, changelogId: string, entryCount: number) {
  return recordChangeEvent({
    versionId,
    type: 'changelog_generated',
    title: '变更摘要生成',
    description: `基于 ${entryCount} 个 commits 生成变更摘要`,
    actor: 'ai',
    changelogId,
  });
}
```

### 5.2 自动事件记录集成

```typescript
// server/src/routes/version.ts

import { recordChangeEvent, onVersionCreated, onScreenshotLinked, onChangelogGenerated } from '../services/changeTracker.js';

// ========== 版本创建时记录事件 ==========
router.post('/', (req: Request, res: Response) => {
  // ... 原有创建逻辑 ...
  
  // 记录变更事件
  onVersionCreated(newVersionId, req.body.createdBy || 'system');
  
  res.json(success({ id: newVersionId, ... }));
});

// ========== 截图关联时记录事件 ==========
router.post('/:id/screenshots', async (req: Request, res: Response) => {
  // ... 原有保存逻辑 ...
  
  const screenshot = ScreenshotModel.create({ ... });
  
  // 记录变更事件
  onScreenshotLinked(req.params.id, screenshot.id, req.body.createdBy || 'system');
  
  res.json(success(screenshot));
});

// ========== Changelog 生成时记录事件 ==========
router.post('/:id/changelog', async (req: Request, res: Response) => {
  // ... 原有生成逻辑 ...
  
  const changelogEntry = generateChangelog({ ... });
  
  // 记录变更事件
  onChangelogGenerated(req.params.id, changelogEntry.id, commits.length);
  
  res.json(success(changelogEntry));
});
```

---

## 6. 前端组件设计

### 6.1 VersionTimeline 组件

```typescript
// components/versions/VersionTimeline.tsx

interface VersionTimelineProps {
  versionId: string;
  events: TimelineEvent[];
  onAddNote?: () => void;
  onDeleteEvent?: (eventId: string) => void;
}

export function VersionTimeline({
  versionId,
  events,
  onAddNote,
  onDeleteEvent,
}: VersionTimelineProps) {
  return (
    <div className="space-y-4">
      {/* 添加备注按钮 */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onAddNote}>
          <Plus className="w-4 h-4 mr-1" />
          添加备注
        </Button>
      </div>
      
      {/* 时间线 */}
      <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
        {events.map((event, index) => (
          <TimelineItem
            key={event.id}
            event={event}
            isLast={index === events.length - 1}
            onDelete={() => onDeleteEvent?.(event.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({
  event,
  isLast,
  onDelete,
}: {
  event: TimelineEvent;
  isLast: boolean;
  onDelete?: () => void;
}) {
  const icon = getEventIcon(event.type);
  const color = getEventColor(event.type);
  
  return (
    <div className="relative pl-6">
      {/* 时间点 */}
      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${color}`} />
      
      {/* 内容 */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{event.title}</span>
            <Badge variant="default" className="text-xs">
              {event.actor}
            </Badge>
          </div>
          <span className="text-xs text-gray-400">
            {formatTime(event.timestamp)}
          </span>
        </div>
        
        {event.description && (
          <p className="text-sm text-gray-500 mt-2">{event.description}</p>
        )}
        
        {/* 截图预览 */}
        {event.screenshot && (
          <div className="mt-3">
            <img
              src={event.screenshot.thumbnailUrl || event.screenshot.url}
              alt="截图"
              className="max-h-32 rounded border cursor-pointer hover:opacity-90"
              onClick={() => openLightbox(event.screenshot!.url)}
            />
            {event.screenshot.messageContent && (
              <p className="text-xs text-gray-400 mt-1">
                {event.screenshot.senderName}: {event.screenshot.messageContent}
              </p>
            )}
          </div>
        )}
        
        {/* Changelog 摘要 */}
        {event.changelog && (
          <div className="mt-3 space-y-1">
            {event.changelog.features?.length > 0 && (
              <div className="text-sm">
                <span className="text-green-600">✨ 新功能:</span>
                {event.changelog.features.join(', ')}
              </div>
            )}
            {event.changelog.fixes?.length > 0 && (
              <div className="text-sm">
                <span className="text-red-600">🐛 修复:</span>
                {event.changelog.fixes.join(', ')}
              </div>
            )}
          </div>
        )}
        
        {/* 删除按钮（仅手动事件） */}
        {event.type === 'manual_note' && onDelete && (
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## 7. 数据库迁移脚本

```sql
-- migrations/xxx_add_version_change_events.sql

-- 变更事件表
CREATE TABLE IF NOT EXISTS version_change_events (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  actor TEXT DEFAULT 'system',
  actor_id TEXT,
  screenshot_id TEXT,
  changelog_id TEXT,
  build_id TEXT,
  task_id TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
);

CREATE INDEX idx_version_events_version ON version_change_events(version_id, created_at DESC);
CREATE INDEX idx_version_events_type ON version_change_events(event_type, created_at DESC);

-- 截图表改为 SQLite
CREATE TABLE IF NOT EXISTS screenshots (
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
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT DEFAULT 'system',
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
);

CREATE INDEX idx_screenshots_version ON screenshots(version_id, created_at DESC);

-- 变更摘要表
CREATE TABLE IF NOT EXISTS version_changelog_entries (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  event_id TEXT,
  features TEXT,
  fixes TEXT,
  improvements TEXT,
  breaking TEXT,
  docs TEXT,
  raw_commits TEXT,
  generated_by TEXT DEFAULT 'ai',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES version_change_events(id) ON DELETE SET NULL
);

CREATE INDEX idx_changelog_entries_version ON version_changelog_entries(version_id, created_at DESC);
```

---

## 8. 验收标准

| 验收项 | 验证方式 |
|--------|----------|
| 版本创建时自动记录事件 | 创建版本 → 查看时间线 |
| 截图关联时记录事件 | 上传截图 → 时间线显示截图事件 |
| Changelog 生成时记录事件 | 生成摘要 → 时间线显示生成事件 |
| 时间线展示正确 | 版本详情页「变更记录」Tab |
| 手动添加备注 | 点击「添加备注」→ 输入内容 → 显示在时间线 |
| 事件删除 | 删除手动备注 → 从时间线移除 |
| 截图预览 | 点击时间线中的截图 → 放大查看 |
| Build 通过 | `npm run build` |

---

## 9. 实施步骤

### 步骤 1：数据库迁移
1. 执行迁移脚本创建新表
2. 迁移现有 screenshots 数据到 SQLite

### 步骤 2：后端实现
1. 创建 `versionChangeEvent.ts` 模型
2. 创建 `changeTracker.ts` 服务
3. 修改 `version.ts` 路由，集成事件记录
4. 修改 `screenshot.ts` 模型，改为 SQLite

### 步骤 3：前端实现
1. 扩展 `types.ts` 类型定义
2. 添加 `versions.ts` API hooks
3. 创建 `VersionTimeline.tsx` 组件
4. 修改 `VersionChangeLogPanel.tsx`

### 步骤 4：验证
1. 创建版本 → 验证事件记录
2. 上传截图 → 验证事件记录
3. 生成 Changelog → 验证事件记录
4. 验证时间线展示

---

**评审结论**: APPROVED — 方案完整，可以开始开发

**设计人**: architect  
**日期**: 2026-03-20  
**关联 Issue**: #188

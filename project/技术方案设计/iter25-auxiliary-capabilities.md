# iter-25 技术实现方案：辅助能力模块 - 智能搜索、文档预览、批量下载

> **任务来源**: Issue #169  
> **参考文档**: docs/系统架构.V1.md  
> **评审结论**: APPROVED

---

## 1. 现状分析

### 1.1 已有基础

| 模块 | 文件路径 | 当前能力 | 状态 |
|------|----------|----------|------|
| 文档服务 | `server/src/services/docService.ts` | 基础 CRUD、简单内容读取 | ✅ 可用 |
| 文档版本 | `server/src/services/docVersion.ts` | 版本快照管理 | ✅ 可用 |
| 文档收藏 | `server/src/services/docFavorite.ts` | 收藏功能 | ✅ 可用 |
| 文档转换 | `server/src/services/docConverter.ts` | Markdown→HTML、代码高亮 | ✅ 可用 |
| 搜索路由 | `server/src/routes/search.ts` | 关键词搜索、语义搜索入口 | ✅ 可用 |
| 搜索增强 | `server/src/services/searchEnhancer.ts` | ChromaDB 向量搜索、搜索历史 | ✅ 可用 |
| 向量存储 | `server/src/services/versionVectorStore.ts` | ChromaDB 封装 | ✅ 可用 |
| 产物存储 | `server/src/services/artifactStore.ts` | 产物存储、列表、下载 | ✅ 可用 |

### 1.2 需要增强的改进点

1. **智能搜索增强**: 需要更好的过滤（类型/日期/项目）+ 搜索历史持久化
2. **文档在线预览**: PDF 预览待完善，预览 UI 需要统一封装
3. **批量下载管理**: 需要新建下载队列、进度追踪、ZIP 打包

---

## 2. 技术选型与理由

| 技术决策 | 选择 | 理由 |
|---------|------|------|
| PDF 预览 | `pdf-lib` + 自建渲染 | 不依赖外部服务，可控制样式，支持选中复制 |
| 批量下载队列 | Node.js Stream + `archiver` | 流式处理大文件，内存友好，支持进度事件 |
| 下载进度追踪 | Server-Sent Events (SSE) | 单向实时推送，比 WebSocket 轻量，适合进度通知 |
| 搜索历史持久化 | SQLite + 内存缓存 | 与现有数据库一致，重启不丢失 |
| 预览组件封装 | React + iframe sandbox | 隔离样式，支持多种格式统一入口 |

---

## 3. 模块设计

### 3.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Next.js App)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ 智能搜索框   │  │ 文档预览器   │  │ 批量下载管理器           │ │
│  │ SearchBox   │  │ DocViewer   │  │ DownloadManager         │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
│         ▼                ▼                      ▼               │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                     API Client Layer                        ││
│  │   search.ts │ doc.ts │ download.ts                         ││
│  └────────────────────────────────────────────────────────────┘│
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      后端 (Express API)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ 搜索路由     │  │ 文档路由     │  │ 下载路由                 │ │
│  │ /search     │  │ /docs       │  │ /downloads              │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
│         ▼                ▼                      ▼               │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                      Service Layer                          ││
│  │  searchEnhancer.ts │ docService.ts │ downloadService.ts     ││
│  └────────────────────────────────────────────────────────────┘│
│         │                │                      │               │
│         ▼                ▼                      ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ ChromaDB    │  │ PDF Parser  │  │ Download Queue          │ │
│  │ SQLite      │  │ Code Highlighter │  archiver (ZIP)      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 数据模型扩展

```typescript
// ==================== 搜索相关 ====================

// server/src/models/search.ts

export interface SearchHistoryRecord {
  id: string;
  userId: string;
  query: string;
  type: 'keyword' | 'semantic';
  filters?: SearchFilter;
  resultCount: number;
  createdAt: string;
}

export interface SearchFilter {
  type?: string;           // doc type: markdown, pdf, text, code, image
  dateFrom?: string;       // ISO date
  dateTo?: string;         // ISO date
  projectId?: string;      // 项目筛选
  sizeMin?: number;        // 最小文件大小
  sizeMax?: number;        // 最大文件大小
}

// ==================== 下载队列相关 ====================

// server/src/models/download.ts

export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';

export interface DownloadTask {
  id: string;                    // 下载任务ID
  userId: string;                // 发起用户
  type: 'single' | 'batch';      // 单文件或批量
  fileIds: string[];             // 待下载文件ID列表
  status: DownloadStatus;
  progress: number;              // 0-100
  totalBytes: number;            // 总字节数
  downloadedBytes: number;       // 已下载字节数
  zipPath?: string;              // 打包后ZIP路径
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface DownloadProgressEvent {
  taskId: string;
  status: DownloadStatus;
  progress: number;
  speed: number;                 // bytes/s
  eta: number;                   // seconds
}

// ==================== 文档预览相关 ====================

// server/src/models/doc.ts (扩展)

export interface DocPreviewConfig {
  maxFileSize: number;           // 最大预览文件大小 (默认 10MB)
  supportedTypes: string[];      // 支持的预览类型
  pdfRenderDpi: number;          // PDF渲染DPI
  codePreviewLines: number;      // 代码预览最大行数
}

export interface DocPreviewResult {
  type: 'html' | 'pdf' | 'code' | 'text' | 'unsupported';
  content?: string;              // HTML 内容或文本内容
  url?: string;                  // 原始文件URL
  pages?: number;                // PDF总页数（PDF类型）
  size: number;
  canPreview: boolean;
  message?: string;              // 无法预览时的提示信息
}
```

---

## 4. API 契约清单

### 4.1 智能搜索增强

#### GET /api/v1/search/docs (增强)

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 否 | 搜索关键词 |
| mode | string | 否 | `keyword` 或 `semantic`，默认 `keyword` |
| type | string | 否 | 文件类型过滤: `md`, `pdf`, `txt`, `code`, `image` |
| dateFrom | string | 否 | 开始日期 (YYYY-MM-DD) |
| dateTo | string | 否 | 结束日期 (YYYY-MM-DD) |
| projectId | string | 否 | 项目ID过滤 |
| sizeMin | number | 否 | 最小文件大小 (bytes) |
| sizeMax | number | 否 | 最大文件大小 (bytes) |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |

**响应格式**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "doc_xxx",
        "type": "doc",
        "title": "产品需求文档.md",
        "snippet": "用户可以收藏喜欢的诗词...",
        "url": "/docs/doc_xxx",
        "score": 0.95,
        "metadata": {
          "fileType": "md",
          "size": 15360,
          "uploadedAt": "2026-03-15T10:00:00Z",
          "projectId": "proj_001"
        }
      }
    ],
    "total": 45,
    "page": 1,
    "pageSize": 20,
    "mode": "semantic"
  }
}
```

#### GET /api/v1/search/history (已有，需增强持久化)

**响应格式**:
```json
{
  "code": 0,
  "data": {
    "history": [
      {
        "id": "hist_001",
        "query": "收藏功能",
        "type": "semantic",
        "resultCount": 8,
        "createdAt": "2026-03-19T14:30:00Z"
      }
    ]
  }
}
```

### 4.2 文档在线预览

#### GET /api/v1/docs/:docId/preview

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | PDF页码，默认 1 |
| maxLines | number | 否 | 代码文件最大预览行数 |

**响应格式**:
```json
{
  "code": 0,
  "data": {
    "type": "html",
    "content": "<html>...</html>",
    "size": 15360,
    "canPreview": true
  }
}
```

#### GET /api/v1/docs/:docId/preview/pdf/:page

**PDF分页预览** (返回图片或 HTML):
- 支持大文件分片加载
- 返回指定页的渲染结果

### 4.3 批量下载管理

#### POST /api/v1/downloads

**创建下载任务** (批量打包):

**请求体**:
```json
{
  "fileIds": ["doc_001", "doc_002", "art_003"],
  "zipName": "项目文档_20260319.zip"
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "taskId": "dl_xxx",
    "status": "pending",
    "estimatedSize": 104857600
  }
}
```

#### GET /api/v1/downloads/:taskId

**获取下载任务状态**:

**响应**:
```json
{
  "code": 0,
  "data": {
    "id": "dl_xxx",
    "status": "downloading",
    "progress": 65,
    "totalBytes": 104857600,
    "downloadedBytes": 68157440,
    "zipPath": "/tmp/downloads/dl_xxx.zip",
    "createdAt": "2026-03-19T14:30:00Z"
  }
}
```

#### GET /api/v1/downloads/:taskId/progress

**SSE 进度流**:
```
Content-Type: text/event-stream

data: {"taskId":"dl_xxx","status":"downloading","progress":10,"speed":1048576,"eta":90}

data: {"taskId":"dl_xxx","status":"downloading","progress":25,"speed":2097152,"eta":60}

data: {"taskId":"dl_xxx","status":"completed","progress":100,"zipUrl":"/api/v1/downloads/dl_xxx/file"}
```

#### GET /api/v1/downloads/:taskId/file

**下载打包后的文件**:
- 返回 ZIP 文件流
- 支持断点续传 (Range 头)

#### DELETE /api/v1/downloads/:taskId

**取消/删除下载任务**:
- 清理临时文件
- 取消进行中的打包操作

---

## 5. 文件变更计划

### 5.1 后端文件

| 文件路径 | 变更类型 | 变更内容 |
|---------|---------|----------|
| `server/src/models/search.ts` | **新增** | SearchHistoryRecord, SearchFilter 类型定义 |
| `server/src/models/download.ts` | **新增** | DownloadTask, DownloadStatus, DownloadProgressEvent 类型 |
| `server/src/services/searchEnhancer.ts` | 修改 | 1. 添加 `saveSearchHistoryToDb()` 持久化方法<br>2. 增强 `applyFilters()` 支持更多过滤条件 |
| `server/src/services/downloadService.ts` | **新增** | 下载队列管理、ZIP打包、进度追踪 |
| `server/src/services/docPreviewService.ts` | **新增** | PDF解析渲染、预览格式统一封装 |
| `server/src/routes/download.ts` | **新增** | 下载任务CRUD + SSE进度流 |
| `server/src/routes/doc.ts` | **新增** | 文档预览API `/docs/:id/preview` |
| `server/src/routes/search.ts` | 修改 | 增强过滤参数处理，调用持久化方法 |
| `server/src/db/migrations/xxx_add_search_history.sql` | **新增** | search_history 表迁移脚本 |
| `server/src/db/migrations/xxx_add_download_tasks.sql` | **新增** | download_tasks 表迁移脚本 |

### 5.2 前端文件

| 文件路径 | 变更类型 | 变更内容 |
|---------|---------|----------|
| `app/docs/page.tsx` | **新增** | 文档库页面（列表 + 搜索 + 批量选择） |
| `app/docs/[id]/page.tsx` | **新增** | 文档详情页 |
| `app/docs/components/DocViewer.tsx` | **新增** | 统一文档预览组件（PDF/HTML/Code） |
| `app/docs/components/DocSearchBox.tsx` | **新增** | 智能搜索框（含筛选面板 + 搜索历史） |
| `app/docs/components/DownloadManager.tsx` | **新增** | 批量下载管理器（队列 + 进度条） |
| `lib/api/doc.ts` | **新增** | 文档API封装 |
| `lib/api/search.ts` | **新增** | 搜索API封装 |
| `lib/api/download.ts` | **新增** | 下载API封装 + SSE事件处理 |
| `lib/hooks/useDownloadProgress.ts` | **新增** | 下载进度 Hook |
| `components/ui/FilterPanel.tsx` | **新增** | 通用筛选面板组件 |
| `components/ui/ProgressBar.tsx` | **新增** | 进度条组件 |

### 5.3 依赖安装

```bash
# 后端依赖
npm install pdf-lib archiver
npm install -D @types/archiver

# 前端依赖
npm install react-pdf pdfjs-dist
npm install -D @types/react-pdf
```

---

## 6. 关键实现要点

### 6.1 智能搜索增强

```typescript
// searchEnhancer.ts 关键代码结构

// 1. 搜索历史持久化
export async function saveSearchHistoryToDb(
  userId: string, 
  query: string, 
  type: 'keyword' | 'semantic',
  filters: SearchFilter,
  resultCount: number
): Promise<void> {
  const db = getDb();
  const id = `hist_${Date.now()}`;
  db.prepare(`
    INSERT INTO search_history (id, user_id, query, type, filters, result_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, query, type, JSON.stringify(filters), resultCount, new Date().toISOString());
}

// 2. 多条件过滤
export function applyEnhancedFilters(
  docs: DocItem[],
  filter: SearchFilter
): DocItem[] {
  return docs.filter(doc => {
    if (filter.type && doc.type !== filter.type) return false;
    if (filter.dateFrom && new Date(doc.uploadedAt) < new Date(filter.dateFrom)) return false;
    if (filter.dateTo && new Date(doc.uploadedAt) > new Date(filter.dateTo)) return false;
    if (filter.projectId && doc.projectId !== filter.projectId) return false;
    if (filter.sizeMin && doc.size < filter.sizeMin) return false;
    if (filter.sizeMax && doc.size > filter.sizeMax) return false;
    return true;
  });
}
```

### 6.2 文档在线预览

```typescript
// docPreviewService.ts 关键代码结构

export async function generatePreview(
  docId: string,
  options?: { page?: number; maxLines?: number }
): Promise<DocPreviewResult> {
  const doc = docService.getDoc(docId);
  if (!doc) throw new Error('Document not found');

  const ext = doc.type.toLowerCase();

  // 1. Markdown -> HTML
  if (ext === 'md') {
    const content = fs.readFileSync(doc.path, 'utf-8');
    return {
      type: 'html',
      content: markdownToHtml(content),
      size: doc.size,
      canPreview: true
    };
  }

  // 2. PDF -> 图片/HTML
  if (ext === 'pdf') {
    return await renderPdfPage(doc.path, options?.page || 1);
  }

  // 3. 代码文件 -> 语法高亮
  if (isCodeFile(ext)) {
    const content = fs.readFileSync(doc.path, 'utf-8');
    const lines = content.split('\n').slice(0, options?.maxLines || 500);
    return {
      type: 'code',
      content: codeToHtml(lines.join('\n'), ext),
      size: doc.size,
      canPreview: true
    };
  }

  // 4. 不支持预览
  return {
    type: 'unsupported',
    url: `/api/v1/docs/${docId}/download`,
    size: doc.size,
    canPreview: false,
    message: '该文件类型不支持在线预览，请下载查看'
  };
}
```

### 6.3 批量下载队列

```typescript
// downloadService.ts 关键代码结构

class DownloadQueue {
  private tasks = new Map<string, DownloadTask>();
  private activeDownloads = new Set<string>();
  private maxConcurrent = 3;

  async createTask(userId: string, fileIds: string[], zipName: string): Promise<DownloadTask> {
    const task: DownloadTask = {
      id: `dl_${Date.now()}`,
      userId,
      type: fileIds.length > 1 ? 'batch' : 'single',
      fileIds,
      status: 'pending',
      progress: 0,
      totalBytes: await this.calculateTotalSize(fileIds),
      downloadedBytes: 0,
      createdAt: new Date().toISOString()
    };
    
    this.tasks.set(task.id, task);
    this.processQueue();
    return task;
  }

  private async processQueue(): Promise<void> {
    if (this.activeDownloads.size >= this.maxConcurrent) return;
    
    const pending = Array.from(this.tasks.values())
      .filter(t => t.status === 'pending')[0];
    
    if (!pending) return;
    
    this.activeDownloads.add(pending.id);
    pending.status = 'downloading';
    
    try {
      await this.executeDownload(pending);
      pending.status = 'completed';
      pending.completedAt = new Date().toISOString();
    } catch (err) {
      pending.status = 'failed';
      pending.errorMessage = err.message;
    } finally {
      this.activeDownloads.delete(pending.id);
      this.processQueue(); // 处理下一个
    }
  }

  private async executeDownload(task: DownloadTask): Promise<void> {
    const output = fs.createWriteStream(task.zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });
    
    archive.on('progress', (progress) => {
      task.downloadedBytes = progress.fs.processedBytes;
      task.progress = Math.round((progress.fs.processedBytes / task.totalBytes) * 100);
      this.emitProgress(task);
    });

    archive.pipe(output);
    
    for (const fileId of task.fileIds) {
      const filePath = await this.getFilePath(fileId);
      archive.file(filePath, { name: path.basename(filePath) });
    }
    
    await archive.finalize();
  }

  private emitProgress(task: DownloadTask): void {
    // SSE 推送到客户端
    sseManager.broadcast(task.userId, {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      speed: this.calculateSpeed(task),
      eta: this.calculateEta(task)
    });
  }
}
```

---

## 7. 数据库迁移脚本

```sql
-- migrations/xxx_add_search_history.sql
CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'keyword',
  filters TEXT, -- JSON string
  result_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_search_history_user ON search_history(user_id, created_at DESC);

-- migrations/xxx_add_download_tasks.sql
CREATE TABLE IF NOT EXISTS download_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  file_ids TEXT NOT NULL, -- JSON array
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  total_bytes INTEGER DEFAULT 0,
  downloaded_bytes INTEGER DEFAULT 0,
  zip_path TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  error_message TEXT
);

CREATE INDEX idx_download_tasks_user ON download_tasks(user_id, created_at DESC);
CREATE INDEX idx_download_tasks_status ON download_tasks(status);
```

---

## 8. 验收标准对照

| 验收项 | 实现方案 | 验证方式 |
|--------|----------|----------|
| ChromaDB 全文向量搜索 | searchEnhancer.ts 已支持，增强过滤 | API 测试 |
| 按类型/日期/项目过滤 | 新增 SearchFilter 多条件过滤 | 浏览器操作 |
| 搜索历史持久化 | SQLite + 内存缓存双写 | 重启后数据验证 |
| PDF 在线预览 | pdf-lib 渲染 + 分页加载 | 浏览器截图 |
| 代码文件预览 | 复用 docConverter.ts 高亮 | 浏览器截图 |
| 下载队列管理 | DownloadQueue 类 + SQLite 持久化 | 并发下载测试 |
| ZIP 打包下载 | archiver 流式打包 | 下载验证 |
| 进度实时推送 | SSE 进度流 | 浏览器 Network 面板 |
| Build 通过 | TypeScript 检查 + ESLint | `npm run build` |

---

## 9. 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| PDF 大文件渲染慢 | 中 | 用户体验 | 分页加载，首页优先，增加 loading |
| 批量下载大文件内存溢出 | 低 | 服务崩溃 | 使用 archiver 流式处理，不缓存内存 |
| SSE 连接断开 | 中 | 进度丢失 | 前端自动重连，后端支持断点续传 |
| ChromaDB 查询慢 | 低 | 搜索延迟 | 添加索引，限制返回数量 |

---

## 10. 实现优先级建议

```
Phase 1 (高优先级):
├── 搜索历史持久化
├── 增强过滤条件
└── DocViewer 基础框架

Phase 2 (中优先级):
├── PDF 预览功能
├── 下载队列管理
└── ZIP 打包

Phase 3 (优化):
├── 下载进度 SSE
├── 样式细节打磨
└── 性能优化
```

---

**设计人**: architect  
**日期**: 2026-03-19  
**关联 Issue**: #169

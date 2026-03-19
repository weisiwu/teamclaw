# 迭代 72：版本面板 Tag 信息展示 - 技术方案设计

## 1. 需求背景

**需求来源**: 迭代 72 任务分派  
**关联迭代**: 迭代 71（已完成"自动 Tag"功能）  
**目标**: 在版本面板或 Tag 面板中展示所有 tag 的详细信息，包括 commit 信息和来源标识。

## 2. 技术选型与理由

| 技术决策 | 选择 | 理由 |
|---------|------|------|
| 数据来源扩展 | Git + DB 合并 | Tag 基础信息存 DB，commit message 实时从 git 获取，确保信息最新 |
| source 字段存储 | SQLite tags 表新增字段 | 简单可靠，与现有 schema 兼容 |
| commit 信息获取 | 后端 gitService 扩展 | 复用现有 `git log` 封装，保持统一 |
| 展开详情交互 | Collapsible Table Row | 在现有列表页直接扩展，保持用户体验一致 |
| 筛选实现 | 后端过滤 + 前端状态 | 减少数据传输，支持分页 |

## 3. 模块划分

### 3.1 后端模块变更

```
server/
├── src/
│   ├── services/
│   │   ├── tagService.ts      # 扩展：source 字段支持
│   │   └── gitService.ts      # 扩展：获取 tag 关联的 commit message
│   ├── routes/
│   │   └── tag.ts             # 扩展：source 筛选参数，完整 commit 信息返回
│   └── models/
│       └── tag.ts             # 扩展：TagRecord 类型定义
```

### 3.2 前端模块变更

```
app/
├── tags/
│   └── page.tsx               # 增强：展开详情、source 筛选、commit message 展示
├── versions/
│   └── page.tsx               # 增强：集成 Tag 面板入口
└── api/
    └── v1/
        └── tags/
            └── route.ts       # 如需要，添加 Next.js API 代理
```

## 4. 数据模型设计

### 4.1 数据库 Schema 变更

```sql
-- tags 表新增 source 字段
ALTER TABLE tags ADD COLUMN source TEXT DEFAULT 'manual';
-- 取值: 'auto' | 'manual'

-- 创建索引支持按 source 筛选
CREATE INDEX IF NOT EXISTS idx_tags_source ON tags(source);
```

### 4.2 TypeScript 类型定义

```typescript
// server/src/models/tag.ts

export interface TagRecord {
  id: string;
  name: string;
  versionId: string;
  versionName?: string;
  commitHash?: string;
  message?: string;
  annotation?: string;
  createdAt: string;
  createdBy?: string;
  archived: boolean;
  protected: boolean;
  archivedAt?: string;
  source: 'auto' | 'manual';  // 新增
}

// 前端展示用的完整 Tag 信息
export interface TagWithCommitInfo extends TagRecord {
  commitMessage?: string;      // 从 git log 获取的完整 commit message
  commitDate?: string;         // commit 实际时间（与 tag 创建时间可能不同）
  commitAuthor?: string;       // commit 作者
}
```

## 5. API 契约清单

### 5.1 获取 Tag 列表（增强）

**端点**: `GET /api/v1/tags`

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 50 |
| prefix | string | 否 | 名称前缀筛选 |
| source | string | 否 | 来源筛选：'auto' \| 'manual' \| 'all' |
| includeCommit | boolean | 否 | 是否包含完整 commit 信息 |

**响应格式**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "data": [
      {
        "id": "tag_xxx",
        "name": "v1.0.0",
        "versionId": "v1",
        "versionName": "v1.0.0",
        "commitHash": "abc1234",
        "commitMessage": "feat: initial release\n\n- Add core features\n- Setup project",
        "commitDate": "2026-03-19T10:00:00Z",
        "commitAuthor": "Developer",
        "createdAt": "2026-03-19T12:00:00Z",
        "createdBy": "system",
        "source": "auto",
        "protected": true
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 50,
    "totalPages": 1
  }
}
```

### 5.2 获取单个 Tag 详情（增强）

**端点**: `GET /api/v1/tags/:tagName`

**响应格式**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "name": "v1.0.0",
    "commit": "abc1234",
    "commitMessage": "feat: initial release",
    "commitDate": "2026-03-19T10:00:00Z",
    "commitAuthor": "Developer",
    "date": "2026-03-19T12:00:00Z",
    "annotation": "Release v1.0.0",
    "source": "auto",
    "hasRecord": true,
    "protected": true
  }
}
```

### 5.3 创建 Tag（增强）

**端点**: `POST /api/v1/tags`

**请求体新增字段**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| source | string | 否 | 'auto' 或 'manual'，默认 'manual' |

## 6. 非功能设计

### 6.1 错误处理

| 场景 | 错误码 | 处理策略 |
|------|--------|----------|
| git 命令失败 | 500 | 返回 DB 记录，commit 信息置空，记录警告日志 |
| tag 不存在 | 404 | 标准错误响应 |
| 受保护 tag 删除 | 403 | 返回中文错误提示："受保护的 tag 不可删除" |

### 6.2 性能考虑

1. **commit 信息获取**: 后端使用 `git log -1 --format` 单次获取，避免多次 exec
2. **分页**: 后端分页减少数据传输，前端保持流畅
3. **缓存**: 暂不做缓存，tag 和 commit 信息需要实时准确

### 6.3 日志规范

```typescript
// 新增日志标签
[TagService] Created auto tag: v1.0.0 for version v1
[TagService] Fetched commit info for tag: v1.0.0, commit: abc1234
[TagAPI] Listed tags with filter: { source: 'auto', page: 1 }
```

## 7. 文件变更计划

### 7.1 后端文件

| 文件路径 | 变更类型 | 变更内容 |
|---------|---------|----------|
| `server/src/db/migrations/xxx_add_tag_source.sql` | 新增 | 添加 source 字段的迁移脚本 |
| `server/src/models/tag.ts` | 修改 | 扩展 TagRecord 接口，添加 source 字段 |
| `server/src/services/gitService.ts` | 修改 | 新增 `getCommitInfo(hash)` 函数 |
| `server/src/services/tagService.ts` | 修改 | 1. createTagRecord 支持 source 参数<br>2. 查询时关联 commit 信息 |
| `server/src/routes/tag.ts` | 修改 | 1. GET / 支持 source 筛选和 includeCommit 参数<br>2. POST / 接收 source 字段 |

### 7.2 前端文件

| 文件路径 | 变更类型 | 变更内容 |
|---------|---------|----------|
| `lib/api/types.ts` | 修改 | 扩展 TagRecord 类型定义 |
| `lib/api/tags.ts` | 新增 | Tag API 客户端封装（如需要） |
| `app/tags/page.tsx` | 修改 | 1. 添加 source 筛选按钮组<br>2. 表格行可展开显示 commit 详情<br>3. 显示 commit message、author、date |
| `app/tags/[name]/page.tsx` | 修改 | 详情页显示 source 标识 |
| `app/versions/page.tsx` | 修改 | 添加"查看 Tags"快捷入口 |

### 7.3 其他文件

| 文件路径 | 变更类型 | 变更内容 |
|---------|---------|----------|
| `project/技术方案设计/tag-display-iter72.md` | 新增 | 本设计文档 |

## 8. 验收标准对照

| 验收标准 | 实现方案 | 验证方式 |
|---------|---------|----------|
| tag 列表展示完整 | 后端分页 + 前端表格 | 单元测试 + 手工验证 |
| commit 信息展示完整 | gitService 扩展获取 commit message | 手工验证 |
| 筛选功能可用 | source 参数后端过滤 | 单元测试 |
| Build 通过 | TypeScript 类型检查 + ESLint | `npm run build` |

## 9. 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| git 命令执行慢 | 中 | 用户体验 | 添加 loading 状态，考虑后续加缓存 |
| source 字段迁移失败 | 低 | 数据丢失 | 备份数据库，迁移脚本幂等设计 |
| commit message 格式问题 | 低 | 显示异常 | 后端做文本清理和截断处理 |

---

**评审结论**: APPROVED — 方案合理，可以开始开发

**设计人**: architect  
**日期**: 2026-03-19  
**关联 Issue**: #72

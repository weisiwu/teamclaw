# PRD - 自动 Tag 与 Tag 管理（iter-71）

> **所属模块**：版本管理模块
> **Issue**：https://github.com/weisiwu/claw_issues/issues/162
> **项目路径**：`/Users/weisiwu_clawbot_mac/Desktop/致富经/apps/teamclaw`
> **完成标准**：所有 API 必须通过 curl 验证；前端页面必须通过浏览器样式检测

---

## 1. 背景与目标

### 现状
- `tagService.ts` 已实现：Tag 记录的内存 CRUD、自动创建、归档、保护、重命名
- `gitService.ts` 已实现：`getTags` / `createTag` / `deleteTag` / `tagExists` 等底层 git 操作
- **缺失**：无 Tag API 路由、无 Version API 路由、tagService 使用内存存储而非真实项目数据库

### 目标
1. 当用户在系统内创建一个**特定版本**（如 `2.1.3`）时，自动为该版本创建对应的 **git tag**（`v2.1.3`）
2. 提供完整的 **Tag 管理能力**：查看、创建、删除、重命名
3. 替换 `tagService` 内存存储为**基于真实项目目录的 DB 文件**（SQLite）

---

## 2. 用户故事

### US-1：手动创建特定版本，自动打 Tag

**角色**：开发者 / main
**场景**：发布一个经过充分测试的正式版本（如 `1.0.0`），不想手动在终端敲 git 命令
**行为**：
- 在版本管理页面点击「创建版本」，输入版本号 `1.0.0`、选择分支、填写摘要
- 系统自动执行 `git tag v1.0.0 -m "Release 1.0.0"`，并写入版本记录
**结果**：版本列表出现 `v1.0.0`，git 仓库中存在对应 tag

---

### US-2：查看所有 Tag，快速定位版本

**角色**：开发者 / reviewer
**场景**：上线后发现 Bug，需要定位是哪个版本引入的
**行为**：
- 打开 Tag 管理页面，看到按时间倒序排列的所有 tag
- 点击某个 tag 查看详情（commit hash、创建时间、关联版本信息）
**结果**：快速定位问题版本

---

### US-3：删除错误 Tag

**角色**：开发者 / main
**场景**：打错 tag（如 `v1.0` 打成 `v1.0.0`），需要清理
**行为**：
- 在 Tag 列表中找到目标 tag，点击删除
- 系统提示「受保护的 tag 不可删除」，如果是普通 tag 则执行 `git tag -d` 并删除记录
**结果**：tag 从 git 仓库和系统中移除

---

### US-4：重命名 Tag

**角色**：main
**场景**：版本号命名不规范（如 `release-1.0` 需改为 `v1.0.0`）
**行为**：
- 在 Tag 详情页点击「重命名」，输入新名称
- 系统执行 `git tag -d old && git tag new` 并更新记录
**结果**：tag 名称更新，commit 历史保持不变

---

## 3. 功能清单

### P0（必须）

| # | 功能 | 说明 |
|---|------|------|
| F1 | 创建版本并自动 Tag | `POST /api/v1/versions` 时自动执行 git tag |
| F2 | Tag 列表查询 | `GET /api/v1/tags` 返回 git tags 列表（来自 git） |
| F3 | Tag 详情查询 | `GET /api/v1/tags/:tagName` 返回 tag 信息 |
| F4 | 删除 Tag | `DELETE /api/v1/tags/:tagName` 删除 git tag + 记录 |
| F5 | 重命名 Tag | `PUT /api/v1/tags/:tagName` 重命名 git tag |
| F6 | Tag 持久化存储 | 引入 SQLite，将 tag 记录存入数据库 |

### P1（建议）

| # | 功能 | 说明 |
|---|------|------|
| F7 | Tag 保护 | 防止删除主版本 tag（如 `v1.0.0`） |
| F8 | Tag 前缀配置 | 支持 `v` / `release/` / 自定义前缀 |

---

## 4. API 端点设计

### 4.1 版本相关

#### `POST /api/v1/versions` — 创建版本（自动打 Tag）

**Request**
```json
{
  "versionId": "2.1.3",
  "branch": "main",
  "summary": "新增收藏功能",
  "commitHash": "a1b2c3d",
  "createdBy": "pm"
}
```

**Response** `{ "code": 0, "data": { "versionId": "v2.1.3", "gitTag": "v2.1.3", "tagCreated": true }, "message": "ok" }`

**逻辑**：
1. 校验 versionId 格式（符合 semver）
2. 检查同名 tag 是否已存在
3. 执行 `git tag v2.1.3 -m "Release v2.1.3"`
4. 写入版本记录到数据库

---

#### `GET /api/v1/versions` — 版本列表

**Query**: `?page=1&pageSize=20&branch=main`

**Response**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "versionId": "v2.1.3",
        "gitTag": "v2.1.3",
        "branch": "main",
        "createdAt": "2026-03-19T10:00:00+08:00",
        "summary": "新增收藏功能",
        "buildStatus": "pending",
        "commitHash": "a1b2c3d"
      }
    ],
    "total": 5
  },
  "message": "ok"
}
```

---

#### `GET /api/v1/versions/:versionId` — 版本详情

**Response**
```json
{
  "code": 0,
  "data": {
    "versionId": "v2.1.3",
    "gitTag": "v2.1.3",
    "branch": "main",
    "commitHash": "a1b2c3d",
    "createdAt": "2026-03-19T10:00:00+08:00",
    "summary": "新增收藏功能",
    "buildStatus": "pending",
    "tagged": true,
    "protected": false
  },
  "message": "ok"
}
```

---

### 4.2 Tag 相关

#### `GET /api/v1/tags` — Tag 列表（来自 git）

**Query**: `?prefix=v&page=1&pageSize=20`

**Response**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "name": "v2.1.3",
        "commit": "a1b2c3d4...",
        "date": "2026-03-19T10:00:00+08:00",
        "annotation": "Release v2.1.3",
        "hasRecord": true,
        "protected": false
      }
    ],
    "total": 8
  },
  "message": "ok"
}
```

---

#### `GET /api/v1/tags/:tagName` — Tag 详情

**Response**
```json
{
  "code": 0,
  "data": {
    "name": "v2.1.3",
    "commit": "a1b2c3d4...",
    "date": "2026-03-19T10:00:00+08:00",
    "annotation": "Release v2.1.3",
    "commits": ["a1b2c3d", "e4f5g6h"],
    "hasRecord": true,
    "protected": false
  },
  "message": "ok"
}
```

---

#### `DELETE /api/v1/tags/:tagName` — 删除 Tag

**Response**
```json
{ "code": 0, "data": { "deleted": true, "tagName": "v2.1.3" }, "message": "ok" }
```

**Error**：`{ "code": 403, "data": null, "message": "受保护的 tag 不可删除" }`

---

#### `PUT /api/v1/tags/:tagName` — 重命名 Tag

**Request**
```json
{ "newName": "v2.1.4" }
```

**Response**
```json
{ "code": 0, "data": { "oldName": "v2.1.3", "newName": "v2.1.4", "tagCreated": true }, "message": "ok" }
```

---

#### `POST /api/v1/tags` — 手动创建 Tag（不依赖版本创建）

**Request**
```json
{
  "name": "v1.0.0",
  "message": "First release",
  "commitHash": "a1b2c3d"
}
```

**Response**
```json
{ "code": 0, "data": { "name": "v1.0.0", "created": true }, "message": "ok" }
```

---

## 5. 数据库设计

### SQLite 表：`versions`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PRIMARY KEY | 版本号（如 `v2.1.3`） |
| branch | TEXT | 所属分支 |
| summary | TEXT | 版本摘要 |
| commit_hash | TEXT | 对应 commit |
| created_by | TEXT | 创建者 |
| created_at | TEXT | 创建时间 |
| build_status | TEXT | pending/success/failed |
| tag_created | INTEGER | 是否已打 tag（0/1） |

### SQLite 表：`tags`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PRIMARY KEY | 自增 ID |
| name | TEXT UNIQUE | tag 名称 |
| version_id | TEXT | 关联版本（可为空） |
| commit_hash | TEXT | commit |
| annotation | TEXT | tag message |
| protected | INTEGER | 是否保护（0/1） |
| created_at | TEXT | 创建时间 |

---

## 6. 非功能需求

- **版本号格式**：严格遵循 semver（`MAJOR.MINOR.PATCH`），非法格式返回 `400`
- **前缀配置**：Tag 前缀通过 `tagConfig` 配置，默认 `v`
- **受保护 Tag**：正则 `^v\d+\.0\.0$`（主版本号首个版本）自动保护
- **存储路径**：数据库文件存于 `~/.openclaw/teamclaw/versions.db`
- **数据源**：所有操作基于真实项目 git 仓库（`projectRepo` 配置）

---

## 7. 验收标准

### API 验收

| # | 验收项 | 验证方式 |
|---|--------|---------|
| V1 | `POST /api/v1/versions` 创建版本后，对应 git tag 已在仓库中存在 | `git tag -l` 验证 |
| V2 | `GET /api/v1/tags` 返回仓库所有 tag 列表 | curl + `git tag` 对比 |
| V3 | `GET /api/v1/tags/:tagName` 返回 tag 详情（commit、date、annotation） | curl 验证 |
| V4 | `DELETE /api/v1/tags/:tagName` 删除后 git tag 不存在 | `git tag -l` 验证 |
| V5 | `PUT /api/v1/tags/:tagName` 重命名后新 tag 存在、旧 tag 不存在 | git 验证 |
| V6 | 删除受保护 tag（如 `v1.0.0`）返回 403 | curl 验证 |
| V7 | 版本号格式错误（如 `1.0`）返回 400 | curl 验证 |
| V8 | 数据库文件 `versions.db` 存在且数据正确写入 | sqlite3 查询验证 |

### 前端验收

| # | 验收项 | 验证方式 |
|---|--------|---------|
| V9 | 版本列表页展示所有版本，卡片布局，buildStatus 颜色区分 | 浏览器截图 |
| V10 | Tag 列表页展示所有 tag，显示名称/时间/是否受保护 | 浏览器截图 |
| V11 | 删除 Tag 有确认对话框，受保护 tag 删除按钮置灰 | 浏览器交互验证 |
| V12 | 创建版本后页面刷新，版本出现在列表顶部 | 浏览器验证 |
| V13 | 空状态、error 状态样式正确 | 浏览器验证 |

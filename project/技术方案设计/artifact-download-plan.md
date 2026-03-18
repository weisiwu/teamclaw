# 产物下载功能技术方案

## 1. 需求背景

本方案针对 Issue #99 "产物下载"功能的增强改进。

**现有功能：**
- `useDownloadArtifact` hook 已实现
- `downloadArtifact` API 函数已存在（返回 `{ success: boolean, url: string }`）
- 版本列表页面已有下载按钮
- Version 类型已有 `artifactUrl` 字段

**PM 改进需求：**
1. **下载入口增强** - 在版本列表、版本详情页添加明显的下载入口
2. **多格式支持** - 支持不同产物格式（zip/apk/exe）下载
3. **下载历史** - 记录下载历史，支持重新下载

---

## 2. 技术选型

| 选型 | 方案 | 理由 |
|------|------|------|
| 状态管理 | React Query + localStorage | 下载历史使用本地存储，无需后端持久化 |
| 产物存储 | 扩展现有 Version.artifactUrl 为数组 | 支持多格式产物，一个版本可能有多个产物文件 |
| 下载追踪 | localStorage | 轻量级方案，无需后端改动 |

---

## 3. 数据结构设计

### 3.1 扩展 Version 类型

```typescript
// lib/api/types.ts 新增

// 产物格式枚举
export type ArtifactFormat = 'zip' | 'apk' | 'exe' | 'dmg' | 'pkg' | 'ipa';

// 单个产物信息
export interface Artifact {
  id: string;
  format: ArtifactFormat;
  url: string;
  fileName: string;
  fileSize: number;  // bytes
  createdAt: string;
}

// 产物格式化选项（用于 UI 显示）
export const ARTIFACT_FORMAT_LABELS: Record<ArtifactFormat, string> = {
  zip: 'ZIP 压缩包',
  apk: 'Android 安装包',
  exe: 'Windows 安装包',
  dmg: 'macOS 安装包',
  pkg: 'macOS 安装包',
  ipa: 'iOS 安装包',
};

export const ARTIFACT_FORMAT_ICONS: Record<ArtifactFormat, string> = {
  zip: '📦',
  apk: '📱',
  exe: '🖥️',
  dmg: '🍎',
  pkg: '🍎',
  ipa: '📱',
};

// 扩展 Version 接口
export interface Version {
  // ... 现有字段
  artifacts: Artifact[];  // 替换原有的 artifactUrl: string | null
}

// 下载历史记录（本地存储）
export interface DownloadRecord {
  id: string;
  versionId: string;
  version: string;
  artifactId: string;
  artifactFileName: string;
  artifactFormat: ArtifactFormat;
  downloadedAt: string;
}
```

### 3.2 localStorage 键名

```
key: 'teamclaw_download_history'
value: DownloadRecord[]
```

---

## 4. API 契约设计

### 4.1 获取版本产物列表

**端点**: `GET /api/v1/versions/:id/artifacts`

**描述**: 获取指定版本的所有产物文件

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "artifact_001",
      "format": "zip",
      "url": "https://cdn.example.com/app-v1.0.0.zip",
      "fileName": "app-v1.0.0.zip",
      "fileSize": 52428800,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "artifact_002", 
      "format": "apk",
      "url": "https://cdn.example.com/app-v1.0.0.apk",
      "fileName": "app-v1.0.0.apk",
      "fileSize": 35651584,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 4.2 下载产物（记录下载历史）

**端点**: `POST /api/v1/versions/:id/download`

**描述**: 下载产物并记录下载历史

**请求参数**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| artifactId | string | 是 | 产物 ID |

**响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "url": "https://cdn.example.com/app-v1.0.0.zip",
    "fileName": "app-v1.0.0.zip"
  }
}
```

---

## 5. 模块划分

### 5.1 前端组件

| 组件 | 路径 | 职责 |
|------|------|------|
| `ArtifactList` | `app/docs/components/ArtifactList.tsx` | 显示版本的所有产物（支持多格式） |
| `ArtifactCard` | `app/docs/components/ArtifactCard.tsx` | 单个产物卡片（图标+格式+大小+下载按钮） |
| `DownloadHistoryPanel` | `app/docs/components/DownloadHistoryPanel.tsx` | 下载历史侧边栏/弹窗 |
| `DownloadButton` (修改) | `app/docs/components/DownloadButton.tsx` | 增强下载按钮，支持多格式选择 |

### 5.2 Hooks

| Hook | 路径 | 职责 |
|------|------|------|
| `useArtifactList` | `lib/api/versions.ts` | 获取版本产物列表 |
| `useDownloadHistory` | `lib/hooks/useDownloadHistory.ts` | 管理下载历史（CRUD + localStorage） |

### 5.3 页面修改

| 页面 | 修改内容 |
|------|----------|
| `app/versions/page.tsx` | 版本列表添加"下载"列，显示产物数量和格式图标 |
| `VersionDetailDialog` | 详情弹窗增加产物列表和下载入口 |
| 新增: `app/versions/[id]/page.tsx` | 版本详情页（可选） |

---

## 6. UI 设计

### 6.1 版本列表下载列

```
| 版本 | 标题 | 状态 | 构建 | 产物 | 操作 |
|------|------|------|------|------|------|
| v1.0.0 | 正式版 | 已发布 | 成功 | 📦zip 📱apk | 下载▼ |
```

- 点击"下载▼"弹出格式选择下拉菜单
- 显示产物数量和格式图标

### 6.2 版本详情弹窗

```
┌─────────────────────────────────────┐
│ 版本详情                        ✕    │
├─────────────────────────────────────┤
│ 基本信息                            │
│   版本号: v1.0.0                    │
│   标题: 正式版发布                  │
├─────────────────────────────────────┤
│ 产物下载                            │
│   ┌─────────────────────────────┐  │
│   │ 📦 ZIP    50 MB        ↓ 下载│  │
│   ├─────────────────────────────┤  │
│   │ 📱 APK    34 MB        ↓ 下载│  │
│   ├─────────────────────────────┤  │
│   │ 🖥️ EXE    62 MB        ↓ 下载│  │
│   └─────────────────────────────┘  │
├─────────────────────────────────────┤
│ 下载历史                            │
│   • v1.0.0 - app.zip   2024-01-15  │
│   • v1.0.0 - app.apk   2024-01-14  │
└─────────────────────────────────────┘
```

---

## 7. 非功能设计

### 7.1 错误处理

- 产物 URL 失效：显示"链接已失效，请重新构建"提示
- 网络错误：Toast 提示"下载失败，请重试"
- 产物不存在：显示"暂无产物"状态

### 7.2 性能优化

- 产物列表使用 React Query 缓存
- 下载历史使用 localStorage，本地读取无延迟
- 大文件显示文件大小（MB/GB）

### 7.3 日志规范

- 下载操作记录到控制台（调试用）
- 错误信息包含 versionId 和 artifactId

---

## 8. 实施步骤

### Phase 1: 数据结构 + Mock 数据
1. 扩展 `Version` 类型，添加 `artifacts` 字段
2. 更新 Mock 数据，为现有版本添加多格式产物

### Phase 2: API 层
1. 实现 `useArtifactList` hook
2. 创建 `GET /api/v1/versions/:id/artifacts` 接口

### Phase 3: UI 组件
1. 创建 `ArtifactCard` 组件
2. 创建 `ArtifactList` 组件
3. 修改版本列表页面添加下载列
4. 修改 `VersionDetailDialog` 添加产物展示

### Phase 4: 下载历史
1. 实现 `useDownloadHistory` hook（localStorage）
2. 创建 `DownloadHistoryPanel` 组件
3. 集成到版本详情弹窗

---

## 9. 兼容性说明

- 现有 `artifactUrl` 字段可作为 fallback：若 `artifacts` 为空，尝试使用 `artifactUrl`
- 版本列表下载按钮保持现有逻辑，优先使用新接口

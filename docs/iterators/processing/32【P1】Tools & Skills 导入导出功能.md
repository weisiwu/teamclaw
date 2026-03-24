# 32【P1】Tools & Skills 导入导出功能

## 背景

用户需要能够导入导出 Tools 和 Skills 配置，支持跨项目/跨团队复用。例如：
- 团队 A 创建了一套 React 编码规范 Skills，导出后分享给团队 B
- 用户从社区下载一组自定义 Tools 定义，导入到自己的系统

## 导出功能

### Tools 导出

**格式**：JSON 文件

```json
{
  "version": "1.0",
  "exportedAt": "2026-03-25T00:00:00Z",
  "type": "tools",
  "items": [
    {
      "name": "http_request",
      "displayName": "HTTP 请求",
      "description": "...",
      "category": "api",
      "parameters": [...],
      "riskLevel": "medium",
      "requiresApproval": true,
      "version": "1.0.0"
    }
  ]
}
```

- 导出时去掉 id/createdAt/updatedAt 等内部字段
- 支持导出全部或按筛选条件导出（分类、来源）

### Skills 导出

**两种格式**：

1. **JSON 格式**（结构化）：与 Tools 类似，包含元信息和 content
2. **ZIP 格式**（Markdown 文件集）：每个 Skill 导出为独立 `.md` 文件，附带 `manifest.json` 描述元信息

```
skills-export.zip
├── manifest.json          # 元信息列表
├── react-coding-guide.md  # Skill 内容
├── deploy-guide.md
└── test-standards.md
```

`manifest.json`:
```json
{
  "version": "1.0",
  "skills": [
    {
      "name": "react-coding-guide",
      "displayName": "React 编码规范",
      "category": "coding",
      "applicableAgents": ["coder1", "coder2"],
      "tags": ["react"],
      "file": "react-coding-guide.md"
    }
  ]
}
```

## 导入功能

### Tools 导入

- 上传 JSON 文件
- 预览将要导入的 Tools 列表
- 冲突检测：如果 name 已存在，提示覆盖/跳过/重命名
- 导入后 source 标记为 `imported`

### Skills 导入

- 支持上传 JSON 或 ZIP 文件
- 支持直接粘贴 Markdown 内容创建单个 Skill
- 预览 → 确认 → 导入
- 冲突处理同 Tools

## 前端 UI

### 导入导出按钮（页面顶部工具栏）

```
[📥 导入] [📤 导出] [🔄 磁盘同步]
```

### 导入弹窗

1. 选择文件类型（JSON / ZIP / 粘贴 Markdown）
2. 上传文件或粘贴内容
3. 预览列表 + 冲突标注
4. 确认导入
5. 显示导入结果（成功 N 个，跳过 N 个，失败 N 个）

### 导出弹窗

1. 选择导出范围（全部 / 按分类筛选 / 按来源筛选）
2. 选择格式（JSON / ZIP）
3. 点击导出，下载文件

## 后端接口

已在任务 30 中定义：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/tools/import` | 导入 Tools |
| GET | `/api/v1/tools/export` | 导出 Tools |
| POST | `/api/v1/skills/import` | 导入 Skills |
| GET | `/api/v1/skills/export` | 导出 Skills |

## 实现文件

- `server/src/services/toolService.ts` — 添加 import/export 方法
- `server/src/services/skillService.ts` — 添加 import/export 方法
- `app/capabilities/page.tsx` — 添加导入导出 UI 组件
- `components/capabilities/ImportDialog.tsx` — 导入弹窗
- `components/capabilities/ExportDialog.tsx` — 导出弹窗

## 依赖关系

- 依赖任务 30（后端 API）和任务 31（前端页面）

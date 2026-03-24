# 创建版本

## 页面路由

```
/versions/new
```

## 页面功能描述

创建新版本记录的表单页面，支持：
- 输入版本号（必填，如 `v1.0.0`）
- 输入标题（必填）
- 输入描述摘要（可选）
- 指定 Git 分支（默认 `main`）
- 关联 Commit Hash（可选）
- 创建成功后自动创建对应的 Git Tag

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `Button` | `@/components/ui/button` | 提交和取消按钮 |
| `Input` | `@/components/ui/input` | 表单输入框 |
| `Label` | `@/components/ui/label` | 表单标签 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `form` | `useState<{version, title, description, branch, commitHash}>` | 表单数据 |
| `touched` | `useState<{version: boolean, title: boolean}>` | 触碰字段记录 |
| `isSubmitting` | `useState<boolean>` | 提交中状态 |
| `error` | `useState<string \| null>` | 错误信息 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `fetch POST` | `/api/v1/versions` | 创建版本记录 |
| `fetch POST` | `/api/v1/versions/[id]/git-tags` | 自动创建 Git Tag |

```typescript
// POST /api/v1/versions
{
  version: "v1.0.0",
  title: "首个稳定版本",
  description: "包含基础功能...",
  status: "draft",
  tags: []
}
```

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/versions` | 创建成功 / 点击取消 | 自动跳转 |

## 表单校验

| 字段 | 校验规则 |
|------|---------|
| 版本号 | 不能为空 |
| 标题 | 不能为空 |
| 描述 | 可为空 |
| 分支 | 默认为 `main` |
| Commit Hash | 可为空 |

## 关键交互

- 创建成功后自动尝试创建对应 Git Tag（失败不影响版本创建）
- 使用 `router.push('/versions')` 跳转回列表页

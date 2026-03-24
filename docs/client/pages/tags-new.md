# 创建 Tag

## 页面路由

```
/tags/new
```

## 页面功能描述

创建新 Git Tag 的表单页面，支持：
- 输入 Tag 名称（必填，格式如 `v1.0.0`）
- 关联 Commit Hash（可选）
- 添加 Tag Message / Annotation（可选）
- 提交后自动跳转到 Tag 列表页

## 主要组件结构

| 组件名 | 来源 | 用途 |
|--------|------|------|
| `Button` | `@/components/ui/button` | 提交和取消按钮 |
| `Input` | `@/components/ui/input` | Tag 名称和 Commit Hash 输入框 |
| `Label` | `@/components/ui/label` | 表单标签 |

## 页面级状态管理

| 状态名 | 类型 | 用途 |
|--------|------|------|
| `form` | `useState<{name, commitHash, message}>` | 表单数据 |
| `touched` | `useState<{name: boolean}>` | 字段是否被触碰（用于错误显示） |
| `isSubmitting` | `useState<boolean>` | 提交中状态 |
| `error` | `useState<string \| null>` | 错误信息 |

## 涉及的 API 调用

| API 函数 | 来源文件 | 用途 |
|---------|---------|------|
| `fetch POST` | `/api/v1/tags` | 创建 Tag |

```typescript
// 请求体示例
{
  name: "v1.2.0",
  commitHash: "abc123",     // 可选
  message: "Release v1.2.0", // 可选
  versionId: "manual",
  versionName: "v1.2.0"
}
```

## 页面间跳转关系

| 目标页面 | 触发方式 | 条件 |
|---------|---------|------|
| `/tags` | 创建成功 / 点击返回 | 自动跳转 |
| `/tags/[name]` | 暂无 | — |

## 表单校验

| 字段 | 校验规则 |
|------|---------|
| Tag 名称 | 不能为空；建议格式 `v*.*.*` |
| Commit Hash | 可为空；留空则使用 HEAD |
| Message | 可为空 |

## 关键交互

- `onBlur` 时标记字段为已触碰，显示错误提示
- 提交时再次校验，阻止空名称提交
- 提交中禁用按钮，显示加载状态

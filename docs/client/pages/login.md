# 登录页

## 页面路由

```
/login
```

## 功能概述

提供用户名/密码登录方式，验证成功后跳转到首页（`/`）。包含表单验证、提交状态管理和错误提示。

## 组件结构

| 组件 | 来源 | 说明 |
|------|------|------|
| `Button` | `@/components/ui/button` | shadcn/ui 按钮 |
| `Input` | `@/components/ui/input` | shadcn/ui 输入框 |
| `Label` | `@/components/ui/label` | shadcn/ui 标签 |
| `Card` | `@/components/ui/card` | shadcn/ui 卡片容器 |
| `CardContent` | `@/components/ui/card` | 卡片内容区 |
| `CardFooter` | `@/components/ui/card` | 卡片底部 |
| `Loader2` | `lucide-react` | 加载图标 |

## 页面状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `username` | `useState<string>` | 用户名输入值 |
| `password` | `useState<string>` | 密码输入值 |
| `isSubmitting` | `useState<boolean>` | 提交中状态 |
| `error` | `useState<string \| null>` | 错误信息 |

## API 调用

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/auth/login` | POST | 用户登录 |

**请求体：**
```json
{
  "username": "string",
  "password": "string"
}
```

**响应（成功）：**
```json
{
  "code": 200,
  "data": {
    "token": "jwt_token_string",
    "user": { "id": "...", "name": "...", "role": "admin" }
  }
}
```

## 表单验证

- 用户名：必填，不允许空字符串
- 密码：必填，不允许空字符串
- 提交按钮在验证通过前禁用

## 页面跳转关系

- 登录成功 → `/`（首页）
- 首页已有登录状态 → 重定向至 `/`

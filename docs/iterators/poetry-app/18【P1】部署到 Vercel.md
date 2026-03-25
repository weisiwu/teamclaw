# 18【P1】部署到 Vercel

## 任务目标

将 poetry-app 部署到 Vercel，确保生产环境正常运行。

## 详细说明

### 18.1 Vercel 配置

创建 `vercel.json`：
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

### 18.2 环境变量

在 Vercel 控制台配置：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 18.3 部署流程

1. GitHub 仓库连接
2. 自动部署配置
3. 预览部署测试
4. 生产环境部署

### 18.4 自定义域名（可选）

配置自定义域名 poetry-app.xxx.com

## 验收标准

- [ ] Vercel 部署成功
- [ ] 环境变量配置正确
- [ ] 生产环境正常运行

## 依赖

任务 06（诗词列表页）
任务 07（诗词详情页）

## 预计工作量

0.5 人天

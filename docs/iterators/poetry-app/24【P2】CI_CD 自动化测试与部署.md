# 24【P2】CI/CD 自动化测试与部署

## 任务目标

配置 GitHub Actions 实现自动化测试和部署。

## 详细说明

### 24.1 GitHub Actions 工作流

创建 `.github/workflows/ci.yml`：
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### 24.2 测试配置

确保有测试用例：
- Jest 单元测试
- Playwright E2E 测试

## 验收标准

- [ ] CI 流水线正常
- [ ] PR 检查通过
- [ ] 自动部署正常

## 依赖

任务 18（部署到 Vercel）

## 预计工作量

0.5 人天

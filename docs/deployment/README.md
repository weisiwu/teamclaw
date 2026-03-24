# TeamClaw 部署文档索引

本文档是 TeamClaw 项目配置与部署相关文档的索引。

---

## 文档列表

### 1. 环境变量配置说明
**文件**: [environment.md](./environment.md)

详细说明所有环境变量的用途、默认值和配置方法，包括：
- 核心应用配置（NODE_ENV, PORT, HOST）
- 数据库配置（PostgreSQL）
- 缓存配置（Redis）
- 向量数据库（ChromaDB）
- LLM API 密钥（OpenAI, Anthropic, DeepSeek）
- 安全与认证（JWT_SECRET）
- 第三方集成（飞书）
- 生产环境检查清单

---

### 2. 部署流程文档
**文件**: [deployment.md](./deployment.md)

介绍三种部署方式：
- **Docker Compose**（推荐）- 生产环境一键部署
- **Vercel** - 快速部署前端
- **PM2** - 传统服务器部署

包含详细的部署步骤、SSL 配置、故障排查指南。

---

### 3. 数据库迁移说明
**文件**: [database.md](./database.md)

涵盖数据库管理相关内容：
- 数据库架构和核心表说明
- 迁移系统工作原理
- 创建和执行迁移
- 数据库初始化脚本
- 备份与恢复操作
- 性能优化建议

---

### 4. 常用运维操作指南
**文件**: [operations.md](./operations.md)

日常运维操作速查手册：
- 服务启动/停止/重启
- 日志查看和清理
- 健康检查命令
- 数据库操作
- 缓存管理（Redis）
- 备份与恢复脚本
- 故障排查流程
- 性能监控

---

### 5. 目录结构说明
**文件**: [structure.md](./structure.md)

项目目录结构详解：
- 前端目录（app/, components/, lib/）
- 后端目录（server/src/）
- 文档目录（docs/）
- 测试目录（tests/）
- 配置文件说明
- 开发工作流指南

---

### 6. package.json 脚本说明
**文件**: [scripts.md](./scripts.md)

npm 脚本的详细说明：
- 开发脚本（dev, dev:all, dev:backend, dev:frontend）
- 构建脚本（build, start）
- 代码质量脚本（lint, format）
- 测试脚本（test, test:ui, test:coverage）
- 使用速查表和故障排查

---

### 7. 技术栈汇总
**文件**: [tech-stack.md](./tech-stack.md)

完整技术栈清单：
- 前端技术栈（Next.js, React, Tailwind CSS）
- 后端技术栈（Express.js, PostgreSQL, Redis）
- 测试技术栈（Vitest, Testing Library）
- 部署工具（Docker, PM2, Nginx）
- 开发工具（ESLint, Prettier, Husky）
- 技术架构图和选型理由

---

## 快速开始

### 新环境部署

1. 阅读 [environment.md](./environment.md) 了解配置项
2. 选择部署方式，阅读 [deployment.md](./deployment.md)
3. 按照指南执行部署

### 日常运维

1. 查看 [operations.md](./operations.md) 执行运维操作
2. 需要数据库变更时查看 [database.md](./database.md)

### 开发参考

1. 了解项目结构查看 [structure.md](./structure.md)
2. 查看可用脚本参考 [scripts.md](./scripts.md)
3. 了解技术栈查看 [tech-stack.md](./tech-stack.md)

---

## 相关文档

- [项目根目录 README](../../README.md) - 项目概览
- [系统架构文档](../系统架构.V1.md) - 架构设计说明
- [项目优化清单](../项目优化清单.md) - 优化方向列表

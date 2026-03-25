# 01【P0】Supabase 项目初始化与数据库配置

## 任务目标

搭建 poetry-app 的 Supabase 项目，完成数据库初始化配置。

## 详细说明

### 1.1 创建 Supabase 项目

在 Supabase Dashboard 创建新项目：
- Project name: `poetry-app`
- Database password: 自动生成或自定义
- Region: 选择靠近用户的区域（如 `ap-northeast-1`）

获取项目 URL 和 anon key，记录到 `.env.local`：
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
```

### 1.2 配置 Supabase Client

在项目中安装并配置 Supabase 客户端：
```bash
npm install @supabase/supabase-js
```

创建 `src/lib/supabase.ts`：
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 1.3 启用向量扩展（未来向量化检索用）

在 Supabase SQL Editor 中执行：
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 验收标准

- [ ] Supabase 项目创建成功
- [ ] `.env.local` 文件包含正确的 URL 和 ANON_KEY
- [ ] Supabase 客户端可正常连接

## 技术栈

- Supabase
- TypeScript

## 依赖

无

## 预计工作量

0.5 人天

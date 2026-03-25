# 04【P0】诗词 CRUD API 接口开发

## 任务目标

基于 Supabase 开发诗词相关的 API 接口，支持列表、详情、筛选、搜索功能。

## 详细说明

### 4.1 创建 API 路由

在 Next.js App Router 中创建 `app/api/` 路由：

#### 4.1.1 诗词列表接口

**GET `/api/poems`**

Query 参数：
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 20）
- `dynasty`: 朝代筛选（可选）
- `poetId`: 诗人 ID 筛选（可选）
- `type`: 诗词类型筛选（可选）
- `tag`: 标签筛选（可选）
- `search`: 搜索关键词（可选，搜索标题和诗人名）

响应格式：
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 101,
    "totalPages": 6
  }
}
```

#### 4.1.2 诗词详情接口

**GET `/api/poems/[id]`**

响应格式：
```json
{
  "id": 1,
  "title": "静夜思",
  "titleArabic": "...",
  "poet": {
    "id": 1,
    "name": "李白",
    "nameArabic": "..."
  },
  "dynasty": {
    "id": 1,
    "name": "唐"
  },
  "poetryType": {
    "id": 1,
    "name": "诗"
  },
  "content": ["床前明月光", "疑是地上霜", ...],
  "contentArabic": [...],
  "culturalContext": "...",
  "tags": [{"id": 1, "name": "思乡"}, ...]
}
```

#### 4.1.3 朝代列表接口

**GET `/api/dynasties`**

#### 4.1.4 诗人列表接口

**GET `/api/poets`**

Query 参数：
- `dynastyId`: 朝代筛选（可选）

### 4.2 使用 Supabase 客户端

```typescript
// app/api/poems/route.ts
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const dynasty = searchParams.get('dynasty')
  const search = searchParams.get('search')

  let query = supabase
    .from('poems')
    .select(`
      *,
      poets(name, name_arabic, dynasties(name)),
      poetry_types(name),
      poem_tags(tags(name))
    `)

  if (dynasty) {
    query = query.eq('dynasties.name', dynasty)
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,poets.name.ilike.%${search}%`)
  }

  const { data, error, count } = await query
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    data,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  })
}
```

## 验收标准

- [ ] 诗词列表接口返回正确分页数据
- [ ] 诗词详情接口返回完整信息（含诗人、朝代、标签）
- [ ] 支持朝代、诗人、类型、标签筛选
- [ ] 支持关键词搜索
- [ ] 错误处理完善

## 技术栈

- Next.js App Router
- TypeScript
- Supabase

## 依赖

任务 01（Supabase 项目初始化）
任务 02（数据库表结构设计）
任务 03（数据导入）

## 预计工作量

1 人天

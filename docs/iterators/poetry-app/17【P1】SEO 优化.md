# 17【P1】SEO 优化

## 任务目标

优化 poetry-app 的 SEO，包括标题、描述、结构化数据等。

## 详细说明

### 17.1 Meta 标签

每个页面设置正确的 title 和 description：
- 首页：诗词宝库 - 中阿对照古诗词大全
- 详情页：{诗词名} by {诗人} - 诗词宝库

### 17.2 Open Graph

配置社交分享卡片：
```html
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
```

### 17.3 结构化数据

添加诗词 Schema.org 结构化数据：
```json
{
  "@context": "https://schema.org",
  "@type": "Poem",
  "name": "静夜思",
  "author": {
    "@type": "Person",
    "name": "李白"
  },
  "text": "床前明月光..."
}
```

## 验收标准

- [ ] 每个页面有正确的 title
- [ ] 社交分享卡片正常
- [ ] 结构化数据正确

## 依赖

任务 06、07

## 预计工作量

0.5 人天

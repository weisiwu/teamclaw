# Card 组件

## 功能说明

卡片容器组件，用于组织和展示相关内容。

## 引入

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
```

## 组件结构

### Card

主容器组件。

| 属性      | 类型     | 说明       |
| --------- | -------- | ---------- |
| className | `string` | 自定义类名 |

### CardHeader

卡片头部，用于放置标题和描述。

| 属性      | 类型     | 说明       |
| --------- | -------- | ---------- |
| className | `string` | 自定义类名 |

### CardTitle

卡片标题。

| 属性      | 类型     | 说明       |
| --------- | -------- | ---------- |
| className | `string` | 自定义类名 |

### CardContent

卡片内容区域。

| 属性      | 类型     | 说明       |
| --------- | -------- | ---------- |
| className | `string` | 自定义类名 |

### CardFooter

卡片底部，通常放置操作按钮。

| 属性      | 类型     | 说明       |
| --------- | -------- | ---------- |
| className | `string` | 自定义类名 |

## 使用示例

```tsx
<Card>
  <CardHeader>
    <CardTitle>项目信息</CardTitle>
  </CardHeader>
  <CardContent>
    <p>这里是卡片内容...</p>
  </CardContent>
  <CardFooter>
    <Button>确认</Button>
  </CardFooter>
</Card>
```

## 样式特性

- 圆角 `rounded-xl`
- 白色背景（暗色模式为 slate-800）
- 轻微阴影 `shadow-sm`
- hover 时阴影加深并显示边框
- 内容区域 padding 为 6（24px）

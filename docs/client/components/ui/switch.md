# Switch 组件

## 功能说明

开关切换组件，用于布尔值切换。

## 引入

```tsx
import { Switch } from '@/components/ui/switch';
```

## Props

继承自 React input checked 属性。

## 使用示例

```tsx
const [enabled, setEnabled] = useState(false);

<Switch checked={enabled} onCheckedChange={setEnabled} />

// 配合标签
<div className="flex items-center gap-2">
  <Switch id="notifications" />
  <Label htmlFor="notifications">启用通知</Label>
</div>
```

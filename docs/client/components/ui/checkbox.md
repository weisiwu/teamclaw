# Checkbox 组件

## 功能说明

复选框组件。

## 引入

```tsx
import { Checkbox } from '@/components/ui/checkbox';
```

## Props

继承自 React.InputHTMLAttributes。

## 使用示例

```tsx
const [checked, setChecked] = useState(false);

<Checkbox
  id="terms"
  checked={checked}
  onCheckedChange={setChecked}
/>
<Label htmlFor="terms">我已阅读并同意条款</Label>
```

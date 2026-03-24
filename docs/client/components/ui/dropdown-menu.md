# DropdownMenu 组件

## 功能说明

下拉菜单组件，基于 Base UI Menu 封装，支持多级菜单、复选框、单选框等复杂场景。

## 引入

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
```

## 组件

| 组件                     | 说明                    |
| ------------------------ | ----------------------- |
| DropdownMenu             | 根容器                  |
| DropdownMenuTrigger      | 触发器（通常为 Button） |
| DropdownMenuContent      | 菜单内容区              |
| DropdownMenuItem         | 菜单项                  |
| DropdownMenuLabel        | 菜单标签                |
| DropdownMenuSeparator    | 分隔线                  |
| DropdownMenuCheckboxItem | 复选框菜单项            |
| DropdownMenuRadioGroup   | 单选框组                |
| DropdownMenuRadioItem    | 单选框菜单项            |
| DropdownMenuSub          | 子菜单容器              |
| DropdownMenuSubTrigger   | 子菜单触发器            |
| DropdownMenuSubContent   | 子菜单内容              |

## 使用示例

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">菜单</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>操作</DropdownMenuLabel>
    <DropdownMenuItem>编辑</DropdownMenuItem>
    <DropdownMenuItem variant="destructive">删除</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>复制</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## DropdownMenuItem Props

| 属性    | 类型                         | 默认值      | 说明     |
| ------- | ---------------------------- | ----------- | -------- |
| variant | `"default" \| "destructive"` | `"default"` | 变体     |
| inset   | `boolean`                    | `false`     | 是否缩进 |

## DropdownMenuContent Props

| 属性       | 类型                                     | 默认值     | 说明     |
| ---------- | ---------------------------------------- | ---------- | -------- |
| align      | `"start" \| "center" \| "end"`           | `"start"`  | 对齐方式 |
| side       | `"top" \| "right" \| "bottom" \| "left"` | `"bottom"` | 弹出方向 |
| sideOffset | `number`                                 | `4`        | 偏移量   |

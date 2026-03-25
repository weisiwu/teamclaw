# 【P1】UI 整体现代化改造 - 引入 shadcn/ui 组件库

## 背景
当前 UI 全部手写 Tailwind，无任何现代化组件库。样式陈旧、像 20 年前的后台管理系统。没有 shadcn/ui、Radix 等现代组件基础，导致按钮、输入框、弹窗、下拉菜单等基础组件质量参差不齐。

## 目标
- 引入 shadcn/ui 作为基础组件库
- 替换所有手写的基础 UI 组件（Button、Input、Select、Dialog、Tabs、Card 等）
- 统一组件 API 和视觉风格
- 支持暗色模式无缝切换

## 技术方案
1. 安装 shadcn/ui CLI 并初始化项目配置
2. 逐步替换 `components/ui/` 下的手写组件：
   - Button → shadcn Button
   - Input / Select / Textarea → shadcn Form 组件
   - Dialog / Modal → shadcn Dialog
   - Tabs → shadcn Tabs
   - Card → shadcn Card
   - Toast → shadcn Toast (Sonner)
   - DropdownMenu → shadcn DropdownMenu
3. 更新所有页面中对旧组件的引用
4. 保留现有 Tailwind 工具类，shadcn 与 Tailwind 完全兼容

## 实现文件
- `components.json` — shadcn 配置文件（新建）
- `components/ui/*.tsx` — 全部替换为 shadcn 组件
- 所有 `app/*/page.tsx` — 更新组件引用
- `package.json` — 添加 @radix-ui 依赖
- `tailwind.config.ts` — 更新配置适配 shadcn

## 依赖关系
- 前置：38-45（功能精简完成后再改组件，避免重复工作）
- 后续：配色方案刷新、动效升级

## 验证方式
1. 所有基础 UI 组件使用 shadcn 版本
2. 按钮、输入框、弹窗等视觉风格统一且现代
3. 暗色模式切换正常
4. 无组件引用报错
5. **至少 5 轮修改验证**：Button/Input→Dialog/Tabs→Card/Toast→全页面替换→暗色模式

## 状态
⏳ 待执行

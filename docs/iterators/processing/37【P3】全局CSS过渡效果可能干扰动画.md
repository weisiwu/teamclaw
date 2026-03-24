# 19【P3】全局 CSS 过渡效果可能干扰动画

## 问题描述

`app/globals.css` 中设置了全局通配符过渡：

```css
/* line 260-264 */
* {
  transition-property: background-color, border-color, color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease-in-out;
}
```

这会导致以下问题：

1. **所有元素**的背景色、边框色、文字色变化都会有 150ms 过渡，即使不需要
2. **性能影响**：大量 DOM 元素被动应用 transition，增加 GPU 合成层
3. **与 Tailwind transition 类冲突**：`transition-colors`、`transition-all` 等 Tailwind 类可能被覆盖或叠加
4. **深色模式切换**时所有元素同时过渡，可能产生"闪烁波浪"效果
5. **骨架屏动画**可能受影响（`animate-pulse` 改变 opacity，但 opacity 不在列表中所以侧面影响较小）

## 期望效果

- 过渡效果仅应用在需要的元素上，而非全局通配符
- 保留 `.hover-lift`、`.hover-button` 等自定义过渡类
- Tailwind 的 `transition-colors`、`transition-all` 作为主要过渡手段

## 样式方案

**样式类型：CSS 重构**

### 方案一：移除全局通配符，依赖 Tailwind 类（推荐）

```css
/* 删除 * { transition-property: ... } 块 */
/* 在需要过渡的元素上使用 Tailwind 类：*/
/* class="transition-colors duration-150" */
```

**影响范围**：移除后，之前依赖隐式过渡的元素（如 hover 变色）需要手动添加 `transition-colors`。需逐页检查是否有依赖此全局过渡的交互。

### 方案二：缩小选择器范围（保守）

```css
/* 仅对交互元素应用过渡 */
a, button, input, select, textarea,
[role="button"], [role="tab"] {
  transition-property: background-color, border-color, color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease-in-out;
}
```

### 同时清理冗余过渡类

删除 `globals.css` 中与 Tailwind 内置类功能重复的：

```css
/* 可删除 — Tailwind 已有 transition-transform */
.transition-transform { ... }

/* 可删除 — Tailwind 已有 transition-all */
.transition-all { ... }
```

## 修改步骤

1. 选择方案一或方案二
2. 修改 `app/globals.css`
3. 全局搜索依赖隐式过渡的 hover 效果，补充 `transition-colors` 类
4. 验证深色模式切换、sidebar 折叠、按钮 hover 等交互无异常

## 修改范围

- `app/globals.css` — 修改全局过渡选择器
- 各页面可能需要补充 `transition-colors` 类（视方案而定）

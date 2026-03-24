# 02【P1】前端残留 Mock 数据与 delay 清理

> 优先级：🟠 P1（数据真实性）
> 发现日期：2026-03-25
> 状态：待处理

---

## 问题描述

项目优化清单 M7 要求「清除项目 Mock 数据」，部分前端 API 文件中的 mock 数据已被清除，但仍有 **2 个文件** 残留完整的 mock 数组和 `delay()` 模拟调用。

### 残留清单

#### 1. `lib/api/versionScreenshot.ts`

- `mockVersionScreenshots` 数组（3 条假截图数据）
- API 失败时静默回退 mock（`catch` 中返回假数据而非抛出错误）
- `linkScreenshot()` 失败时向 mock 数组写入假记录
- `unlinkScreenshot()` 操作的是 mock 数组而非真实 API

#### 2. `lib/api/versionSummary.ts`

- `mockUpgradeConfigs` 数组（升级配置假数据）
- `mockUpgradeHistory` 数组（升级历史假数据）
- `getUpgradeConfig()` — 使用 `delay(100)` + 读 mock 数组
- `updateUpgradeConfig()` — 使用 `delay(50)` + 写 mock 数组
- `previewUpgrade()` — 使用 `delay(150)` + 硬编码 `v1.0.0`
- `getUpgradeHistory()` — 使用 `delay(100)` + 读 mock 数组
- `addUpgradeRecord()` — 使用 `delay(50)` + 写 mock 数组

#### 3. `lib/api/versionShared.ts`

- 导出 `delay()` 函数供上述文件使用
- 注释写「仅用于本地开发」但实际在生产代码中被调用

## 风险

- 前端页面展示伪造截图和升级历史，掩盖真实功能缺失
- API 失败时静默回退 mock，开发者无法发现后端 Bug
- `delay()` 增加无意义的请求延迟

## 优化方案

1. **`versionScreenshot.ts`**：删除 `mockVersionScreenshots` 数组，API 失败时抛出错误
2. **`versionSummary.ts`**：删除 `mockUpgradeConfigs`、`mockUpgradeHistory`，升级配置/历史改为调用真实后端 API
3. **`versionShared.ts`**：删除 `delay()` 导出（如果没有其他使用者）
4. 确保后端有对应的升级配置和截图 API 端点

## 涉及文件

- `lib/api/versionScreenshot.ts` → 删除 mock，改为纯 API 调用 + 错误抛出
- `lib/api/versionSummary.ts` → 删除 mock 和 delay，接入真实 API
- `lib/api/versionShared.ts` → 删除 `delay` 函数

## 验收标准

- [ ] 前端 `lib/api/` 目录无任何 `mock` 数组
- [ ] 无 `delay()` 模拟调用
- [ ] API 失败时抛出错误而非静默回退假数据
- [ ] 截图和升级配置功能接入真实后端

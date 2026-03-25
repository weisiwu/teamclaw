# 27【P2】环境变量 API Key 平滑迁移方案

## 背景

完成任务 20-22 后，API Token 将由平台管理，但现有用户可能已在 `.env` 文件中配置了 API Key：

```
DEEPSEEK_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-xxx
```

需要一个平滑迁移路径，让已有环境变量自动导入为平台管理的 Token，同时保持向后兼容。

## 方案

### 启动时自动检测与导入

服务启动时检测环境变量中的 API Key，如果平台中尚无对应 Token，自动创建：

```typescript
async function migrateEnvTokens() {
  const envKeys = [
    { env: 'DEEPSEEK_API_KEY', provider: 'deepseek', alias: '环境变量 DeepSeek', models: ['deepseek-chat'] },
    { env: 'OPENAI_API_KEY', provider: 'openai', alias: '环境变量 OpenAI', models: ['gpt-4o', 'gpt-4o-mini'] },
    { env: 'ANTHROPIC_API_KEY', provider: 'anthropic', alias: '环境变量 Anthropic', models: ['claude-sonnet-4-20250514'] },
  ];

  for (const { env, provider, alias, models } of envKeys) {
    const key = process.env[env];
    if (!key) continue;

    // 检查是否已存在该 key 的 Token（按 provider + key 前缀匹配）
    const existing = await apiTokenService.findByProviderAndKeyPrefix(provider, key.slice(0, 8));
    if (existing) continue;

    // 自动创建 Token
    await apiTokenService.create({
      alias: `${alias}（自动导入）`,
      provider,
      apiKey: key,
      models,
      note: `从环境变量 ${env} 自动导入`,
    }, 'system');

    console.log(`[migration] Auto-imported ${env} as platform token`);
  }
}
```

### 前端提示

首次登录时，如果检测到自动导入的 Token，在 Dashboard 显示提示卡片：

> 检测到 3 个 API Token 已从环境变量自动导入。
> 建议前往 [Token 管理] 确认配置并为 Agent 分配 Token。
> [前往配置 →] [不再提示]

### 迁移完成后

环境变量 Key 仍作为兜底（任务 22 的向后兼容策略），用户可以随时在 `.env` 中删除这些变量，完全由平台管理。

## 修改文件

- `server/src/services/apiTokenService.ts` — 添加 `migrateEnvTokens()` + `findByProviderAndKeyPrefix()`
- `server/src/index.ts` — 启动时调用迁移
- `app/page.tsx` — Dashboard 显示迁移提示卡片（可选）

## 依赖关系

- 依赖任务 20（Token CRUD）完成
- 属于收尾任务，可最后实施

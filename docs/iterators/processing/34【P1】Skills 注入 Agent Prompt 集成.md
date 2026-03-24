# 34【P1】Skills 注入 Agent Prompt 集成

## 背景

当前 `agentPrompts.ts` 中的 `{{SKILLS}}` 占位符，在 `buildSystemPrompt()` 调用时大多传入空值（`"（无可用 Skills）"`）。`agentExecution.ts` 构建消息时虽然调用了 `loadSkills()`，但读取的是磁盘文件（`~/.openclaw/skills/`），与平台中管理的 Skills 数据（任务 29-30）没有打通。

## 目标

将平台管理的 Skills 与 Agent Prompt 构建流程集成：

1. Agent 执行任务时，自动查询该 Agent 启用的 Skills
2. 将 Skill 内容注入 system prompt 的 `{{SKILLS}}` 占位符
3. 支持按 Skill 的 `applicableAgents` 字段过滤

## 改造方案

### 1. 修改 agentExecution.ts 的消息构建

```typescript
// server/src/services/agentExecution.ts
function buildAgentMessages(agentName: string, taskId: string, prompt: string): LLMMessages[] {
  // 现有：从磁盘加载 skills
  // const skills = loadSkillsFromDisk(agentName);

  // 改为：从平台 skillService 查询启用的 Skills
  const skills = skillService.getSkillsForAgent(agentName);
  const skillsText = skills.map(s => `### ${s.displayName}\n${s.content}`).join('\n\n---\n\n');

  const systemPrompt = buildSystemPrompt(agentName, {
    projectSummary: projectSummary,
    skills: skillsText || '（无可用 Skills）',
    taskContext: taskContext,
  });

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: getUserPromptPrefix(agentName) + prompt },
  ];
}
```

### 2. skillService 新增查询方法

```typescript
// server/src/services/skillService.ts

/**
 * 获取指定 Agent 可用的所有启用 Skills
 * 筛选规则：enabled=true AND (applicableAgents 为空 OR 包含 agentName)
 */
function getSkillsForAgent(agentName: string): SkillDefinition[] {
  return getAllSkills().filter(s =>
    s.enabled &&
    (s.applicableAgents.length === 0 || s.applicableAgents.includes(agentName))
  );
}
```

### 3. Token 限制保护

Skills 内容可能很长，注入 prompt 时需要控制总长度：

```typescript
function truncateSkills(skills: SkillDefinition[], maxTokens: number = 8000): string {
  let totalTokens = 0;
  const included: string[] = [];

  for (const skill of skills) {
    const tokens = estimateTokens(skill.content);
    if (totalTokens + tokens > maxTokens) {
      included.push(`### ${skill.displayName}\n（内容过长，已省略。完整内容请查看 Skills 管理页面）`);
      break;
    }
    included.push(`### ${skill.displayName}\n${skill.content}`);
    totalTokens += tokens;
  }

  return included.join('\n\n---\n\n');
}
```

## 修改文件

- `server/src/services/agentExecution.ts` — 改用 skillService 查询 Skills
- `server/src/services/skillService.ts` — 新增 `getSkillsForAgent()` 和 `truncateSkills()`
- `server/src/prompts/agentPrompts.ts` — 无需修改（已有 `{{SKILLS}}` 占位符）

## 依赖关系

- 依赖任务 29（Skill 数据模型）和任务 30（Skill API / Service）
- 可在任务 30 完成后独立实施

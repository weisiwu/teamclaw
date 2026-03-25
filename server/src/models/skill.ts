/**
 * Skill 数据模型
 * Agent 可参考的知识/流程文档
 */

export type SkillCategory = 'build' | 'deploy' | 'test' | 'structure' | 'coding' | 'review' | 'custom';
export type SkillSource = 'generated' | 'user' | 'imported';

export interface SkillDefinition {
  id: string;
  name: string;                  // 英文标识符（如：project_build_guide）
  displayName: string;           // 显示名称（如：项目构建指南）
  description: string;
  category: SkillCategory;
  source: SkillSource;
  content: string;               // Markdown 内容
  filePath?: string;             // 磁盘文件路径（用于同步）
  applicableAgents: string[];    // 适用的 Agent IDs，空数组表示全部
  enabled: boolean;
  tags: string[];
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  projectId?: string;            // 关联的项目 ID（可选）
}

// 数据库表结构映射（snake_case）
export interface SkillRow {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  source: string;
  content: string;
  file_path: string | null;
  applicable_agents: string;     // JSON array
  enabled: number;               // SQLite: 0/1
  tags: string;                  // JSON array
  version: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  project_id: string | null;
}

// Skill 创建参数
export interface CreateSkillParams {
  name: string;
  displayName: string;
  description: string;
  category: SkillCategory;
  content: string;
  filePath?: string;
  applicableAgents?: string[];
  tags?: string[];
  version?: string;
  projectId?: string;
}

// Skill 更新参数
export interface UpdateSkillParams {
  displayName?: string;
  description?: string;
  category?: SkillCategory;
  content?: string;
  filePath?: string;
  applicableAgents?: string[];
  enabled?: boolean;
  tags?: string[];
  version?: string;
  projectId?: string;
}

// Skill 文件扫描结果
export interface ScannedSkillFile {
  name: string;
  filePath: string;
  content: string;
  category: SkillCategory;
  lastModified: Date;
  size: number;
}

// Skill 同步结果
export interface SkillSyncResult {
  added: string[];               // 新增的 Skill IDs
  updated: string[];             // 更新的 Skill IDs
  removed: string[];             // 移除的 Skill IDs
  unchanged: string[];           // 未变动的 Skill IDs
  errors: string[];              // 错误信息
}

// Skill 搜索过滤选项
export interface SkillFilterOptions {
  category?: SkillCategory;
  source?: SkillSource;
  agentId?: string;              // 过滤适用于指定 Agent 的 Skills
  tags?: string[];
  enabled?: boolean;
  searchQuery?: string;
}

// ========== 内置 Skills ==========

export const BUILTIN_SKILLS: SkillDefinition[] = [
  {
    id: 'builtin_skill_iteration_management',
    name: 'iteration-management-standard',
    displayName: '迭代任务与回顾管理规范',
    description: '定义 Agent 自动迭代过程中任务记录、生命周期流转、迭代回顾的目录结构与操作规范',
    category: 'review',
    source: 'generated',
    content: `# 迭代任务与回顾管理规范

> 适用范围：致富经 Monorepo 下所有 App
> 所有 Agent 在执行迭代时必须遵守本规范。

## 一、核心概念

本规范管理两类文档：

| 文档类型 | 目录 | 面向 | 核心问题 |
|----------|------|------|----------|
| **任务规格书** | \`docs/iterators/\` | 未来 | "接下来要做什么、怎么做" |
| **迭代回顾** | \`issues/\` | 过去 | "这轮做得怎么样、学到了什么" |

两者**不可混用**：\`iterators/\` 不写回顾，\`issues/\` 不写任务规格。

## 二、目录结构标准

每个 \`apps/{app-name}/\` 下必须独立维护：

\`\`\`
apps/{app-name}/
├── docs/
│   └── iterators/               # 任务生命周期管理
│       ├── README.md            # 索引（必须）
│       ├── processing/          # 待执行 & 进行中
│       │   └── README.md        # 任务总览（必须）
│       └── done/                # 已完成归档
│           └── README.md        # 完成索引（必须）
└── issues/                      # 迭代回顾报告
    └── README.md                # 索引（必须）
\`\`\`

### 隔离原则
- App A 的任务只能出现在 \`apps/A/docs/iterators/\` 下，禁止存放到 App B 的目录
- 跨 App 共享文档放 monorepo 根目录 \`docs/\`
- 任何包含 3 个以上文件的目录必须有 README.md 索引

## 三、任务规格书规范（docs/iterators/）

### 文件命名
\`\`\`
{两位序号}【{优先级}】{简洁描述}.md
\`\`\`
- 序号：01-99，执行优先级
- 优先级：P0 阻塞 / P1 重要 / P2 改进 / P3 锦上添花
- 描述：中文优先，≤ 20 字

### 文件内容模板
\`\`\`markdown
# {序号}【{优先级}】{任务名称}

## 背景
{1-3 句话}

## 目标
{可验证的目标列表}

## 技术方案
{实现思路}

## 实现文件
- \\\`path/to/file.ts\\\` — 说明

## 依赖关系
- 前置：{依赖哪些任务}
- 后续：{哪些任务依赖本任务}

## 验证方式
{如何确认完成}

## 状态
⏳ 待执行 / 🔧 进行中 / ✅ 已完成
\`\`\`

### 任务生命周期
1. 创建 → processing/ 新建文件（⏳），更新 README
2. 执行 → 状态改 🔧，追加进展
3. 完成 → 状态改 ✅，追加完成信息，移动到 done/，更新两侧 README

## 四、迭代回顾规范（issues/）

### 文件命名
\`\`\`
{YYYY-MM-DD}-{迭代主题}-issues.md
\`\`\`

### 文件内容模板
\`\`\`markdown
# {App} {迭代主题} 迭代回顾

> 日期：{YYYY-MM-DD}
> 任务范围：processing/ 中的 #{起始}-#{结束}

## 完成概况
| 指标 | 数值 |
|------|------|
| 计划任务数 | X |
| 实际完成数 | Y |
| 跳过/延期数 | Z |

## 逐项记录
### {序号}【{优先级}】{任务名称}
- **状态**：完成 / 跳过
- **Commit**：{hash}
- **执行摘要**：{1-2 句话}
- **遇到的问题**：{如有}
- **解决方案**：{如有}

## 技术决策记录
{重要决策及理由}

## 待改进项
{下轮注意事项}
\`\`\`

## 五、Agent 操作规范

### 创建任务前
1. 先读 \`docs/iterators/processing/README.md\`，了解已有任务和编号
2. 检查是否已有同主题任务，有则更新而非新建
3. 确认任务属于哪个 App，放入对应目录

### 创建任务时
1. 在 processing/ 创建文件，遵循命名规范
2. 使用内容模板，所有字段不可留空（无依赖写 —）
3. 同步更新 processing/README.md

### 完成任务时
1. 追加完成信息（时间、Commit、说明）
2. 移动到 done/
3. 更新 processing/README.md 和 done/README.md

### 迭代结束时
1. 在 issues/ 生成回顾报告
2. 更新 issues/README.md

### 禁止行为
- 在 App A 的目录下创建 App B 的任务
- 创建与已有任务高度重复的文件
- 目录名使用父级名称作前缀（如 poetry-app-fix/）
- 在 issues/ 写任务规格书
- 在 iterators/ 写迭代回顾
- 创建超过 3 个文件的目录不建 README

### 批次目录规范
多轮主题迭代时可在 iterators/ 下建子目录：
- 使用功能语义名，不带 App 名前缀
- 多轮同主题用 -v1、-v2 后缀区分
- 每个批次目录内需要 README.md`,
    applicableAgents: [],
    enabled: true,
    tags: ['iteration', 'management', 'standard', 'review'],
    version: '1.0.0',
    createdAt: '2026-03-26T00:00:00.000Z',
    updatedAt: '2026-03-26T00:00:00.000Z',
    createdBy: 'system',
  },
  {
    id: 'builtin_skill_autonomous_experiment_loop',
    name: 'autonomous-experiment-loop',
    displayName: '自主实验循环流程',
    description: '定义 Agent 自主实验的执行流程：假设→实施→验证→保留/回滚→下一轮，借鉴 autoresearch 的 program.md 模式',
    category: 'coding',
    source: 'generated',
    content: `# 自主实验循环流程（Autonomous Experiment Loop）

> 本流程定义 Agent 在自主实验模式下的行为规范。
> 适用于代码优化、Bug 修复、性能调优等可量化验证的任务。

## 一、核心概念

自主实验模式让 Agent 在无人值守的情况下自主迭代：
- **每次实验** = 一个原子化的代码修改 + 验证
- **固定时间预算**：每次实验有时间上限（默认 5 分钟）
- **单一验证指标**：每次实验用统一标准衡量成败
- **Keep/Discard 决策**：改进则保留（keep），无改进或回退则丢弃（discard）

## 二、实验循环流程

\`\`\`
LOOP（直到达到最大轮次或被手动中止）：

1. 📋 读取当前状态
   - 查看上次实验结果和历史趋势
   - 读取待修改的代码文件

2. 💡 提出假设
   - 基于代码分析提出一个改进假设
   - 假设必须具体、可验证、单一焦点
   - 记录：预期效果和风险评估

3. 🔧 实施修改
   - 只修改必要的文件（最小化变更）
   - git commit 记录修改内容
   - commit message 格式：experiment: {简短描述}

4. ✅ 运行验证
   - 执行验证命令（如 npm run build / npm test）
   - 收集量化指标（构建时间、测试通过率、性能分数等）
   - 超时视为失败

5. 📊 评估结果
   - 对比基线指标
   - 判定：keep（改进）/ discard（无改进或恶化）/ crash（崩溃）

6. 🔄 决策执行
   - keep：保留 commit，更新基线
   - discard：git reset --hard 回到上一个 keep 点
   - crash：记录错误，git reset，尝试修复或跳过

7. 📝 记录结果
   - 追加到实验追踪表（experiment_results）
   - 字段：commit、指标值、内存占用、状态、描述

8. 回到步骤 1
\`\`\`

## 三、验证指标定义

根据任务类型选择对应验证命令和指标：

| 任务类型 | 验证命令 | 主指标 | 方向 |
|----------|----------|--------|------|
| 构建优化 | \`npm run build\` | 构建时间（秒） | 越低越好 |
| 测试修复 | \`npm test\` | 测试通过率（%） | 越高越好 |
| 性能优化 | \`npm run benchmark\` | 性能分数 | 越高越好 |
| Bug 修复 | \`npm run build && npm test\` | 错误数 | 越低越好 |
| 代码质量 | \`npm run lint\` | 警告数 | 越低越好 |

## 四、实验追踪表格式

每次实验记录为一行，字段如下：

| 字段 | 类型 | 说明 |
|------|------|------|
| experiment_id | string | 实验唯一 ID |
| session_tag | string | 实验会话标签（如 mar26-perf） |
| commit_hash | string | git commit 短哈希（7 位） |
| metric_name | string | 指标名称 |
| metric_value | number | 指标值 |
| baseline_value | number | 基线值 |
| delta | number | 变化量（正=改进） |
| status | enum | keep / discard / crash |
| description | string | 本轮实验说明 |
| duration_ms | number | 耗时（毫秒） |
| created_at | timestamp | 记录时间 |

## 五、Agent 行为规范

### 必须遵守
- 每轮只修改一个逻辑单元（单一职责）
- 修改前必须 git commit 当前状态
- discard 时必须完全回滚，不留残余
- 诚实记录结果，不篡改指标
- 简洁优先：同等效果下，更简单的方案更好

### 禁止行为
- 一次实验修改多个不相关的文件
- 跳过验证直接标记 keep
- 删除或修改验证脚本本身
- 忽略 crash 继续累积错误
- 超过最大轮次后继续执行

### 崩溃处理
1. 如果是低级错误（拼写、import），直接修复重跑
2. 如果是方案本身有问题，记录 crash 并跳过
3. 连续 3 次 crash 后暂停，等待人工介入

## 六、分支管理

- 实验在专用分支上进行：\`experiment/{session_tag}\`
- 基于当前主分支创建实验分支
- keep 的修改留在实验分支上
- 实验结束后，人工决定是否合并到主分支
- discard 的修改通过 git reset 清除，不留痕迹`,
    applicableAgents: ['coder', 'coder1', 'coder2'],
    enabled: true,
    tags: ['experiment', 'autonomous', 'loop', 'procedure'],
    version: '1.0.0',
    createdAt: '2026-03-26T00:00:00.000Z',
    updatedAt: '2026-03-26T00:00:00.000Z',
    createdBy: 'system',
  },
];

// Skill 摘要信息（列表视图用）
export interface SkillSummary {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: SkillCategory;
  source: SkillSource;
  enabled: boolean;
  tags: string[];
  version: string;
  contentLength: number;
  applicableAgentCount: number;
  updatedAt: string;
}

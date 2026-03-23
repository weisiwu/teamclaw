# 【P1】M3 Git Clone 命令注入修复

> 优先级：P1（中）
> 前置依赖：无 · 后续影响：项目导入流程安全性

---

## 1. 问题描述

`server/src/services/gitClone.ts` 中直接将用户输入拼接进 shell 命令：

```typescript
import { exec } from 'child_process';
const execAsync = promisify(exec);

// 第 23 行 —— url 未做任何过滤！
await execAsync(`git clone ${url} "${destPath}" --depth 1`);

// 第 26 行 —— destPath 也拼进了 cd 命令
await execAsync(`cd "${destPath}" && git pull`);
```

### 攻击场景

```bash
# 攻击者传入恶意 URL
POST /api/v1/projects/import
{
  "source": "url",
  "url": "https://github.com/normal/repo; rm -rf / --no-preserve-root"
}
```

`exec()` 会启动一个子 shell 执行整个字符串，`;` 后的命令会被直接执行。

### 其他可利用的 shell 元字符

| 字符 | 效果 |
|------|------|
| `;` | 命令分隔，执行第二条命令 |
| `\|` | 管道，将输出传给另一个命令 |
| `&` | 后台执行 |
| `$()` | 命令替换 |
| `` ` `` | 命令替换（反引号） |
| `>` / `>>` | 文件重定向 |

---

## 2. 当前完整代码

```typescript
// server/src/services/gitClone.ts（全部 34 行）
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
const PROJECTS_DIR = path.join(os.homedir(), '.openclaw', 'projects');

export async function cloneOrCopyProject(
  source: 'url' | 'local',
  url?: string,
  localPath?: string
): Promise<string> {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });

  if (source === 'url' && url) {
    const repoName = url.split('/').pop()?.replace('.git', '') || 'project';
    const destPath = path.join(PROJECTS_DIR, repoName);

    try {
      await execAsync(`git clone ${url} "${destPath}" --depth 1`);
    } catch {
      await execAsync(`cd "${destPath}" && git pull`);
    }
    return destPath;
  } else if (source === 'local' && localPath) {
    return localPath;
  }
  throw new Error('Invalid source configuration');
}
```

### 问题总结

| 行 | 问题 |
|----|------|
| 23 | `exec()` + 字符串拼接 → 命令注入 |
| 26 | `cd` + `git pull` 也用 `exec()` 拼接 |
| 19 | `repoName` 从 URL 提取，可能包含特殊字符 |
| 29-31 | `localPath` 未验证，可能是 `/etc/passwd` 等敏感路径 |

---

## 3. 修复方案

### 核心修复：`exec` → `execFile`

`execFile` 不经过 shell，参数作为数组传递，**天然免疫命令注入**。

### 修复后代码

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);
const PROJECTS_DIR = path.join(os.homedir(), '.openclaw', 'projects');

// URL 白名单正则
const SAFE_URL_PATTERN = /^(https?:\/\/|git@)[\w\-._~:/?#\[\]@!$&'()*+,;=%]+$/;
// 仓库名白名单
const SAFE_REPO_NAME = /^[\w\-_.]+$/;

/**
 * 验证 Git URL 安全性
 */
function validateGitUrl(url: string): void {
  if (!SAFE_URL_PATTERN.test(url)) {
    throw new Error(`不安全的 Git URL: ${url}`);
  }

  // 禁止 shell 元字符
  const dangerous = [';', '|', '&', '$', '`', '>', '<', '(', ')', '{', '}'];
  for (const char of dangerous) {
    if (url.includes(char)) {
      throw new Error(`Git URL 包含非法字符: ${char}`);
    }
  }
}

/**
 * 验证本地路径安全性
 */
function validateLocalPath(localPath: string): void {
  const resolved = path.resolve(localPath);

  // 禁止访问敏感系统目录
  const forbidden = ['/etc', '/usr', '/bin', '/sbin', '/var', '/root', '/sys', '/proc'];
  for (const dir of forbidden) {
    if (resolved.startsWith(dir)) {
      throw new Error(`不允许访问系统目录: ${resolved}`);
    }
  }

  // 禁止路径遍历
  if (localPath.includes('..')) {
    throw new Error('路径不允许包含 ..');
  }
}

/**
 * 克隆或复制项目
 */
export async function cloneOrCopyProject(
  source: 'url' | 'local',
  url?: string,
  localPath?: string
): Promise<string> {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });

  if (source === 'url' && url) {
    // 安全校验
    validateGitUrl(url);

    const repoName = url.split('/').pop()?.replace('.git', '') || 'project';
    if (!SAFE_REPO_NAME.test(repoName)) {
      throw new Error(`不安全的仓库名: ${repoName}`);
    }

    const destPath = path.join(PROJECTS_DIR, repoName);

    try {
      // 使用 execFile 避免 shell 注入
      await execFileAsync('git', ['clone', url, destPath, '--depth', '1']);
    } catch {
      // 已存在则 pull
      await execFileAsync('git', ['-C', destPath, 'pull']);
    }
    return destPath;

  } else if (source === 'local' && localPath) {
    validateLocalPath(localPath);

    // 验证路径存在且是目录
    const stat = await fs.stat(localPath);
    if (!stat.isDirectory()) {
      throw new Error(`路径不是目录: ${localPath}`);
    }

    return path.resolve(localPath);
  }

  throw new Error('Invalid source configuration');
}
```

### 关键改动说明

| 改动 | 原因 |
|------|------|
| `exec` → `execFile` | `execFile` 不经过 shell，参数数组传递 |
| `cd && git pull` → `git -C <dir> pull` | `-C` 参数替代 `cd`，无需拼接 shell 命令 |
| 新增 `validateGitUrl()` | 正则白名单 + 危险字符黑名单双重校验 |
| 新增 `validateLocalPath()` | 禁止访问系统目录、禁止路径遍历 |
| 新增 `SAFE_REPO_NAME` | 从 URL 提取的仓库名也需校验 |
| `fs.stat()` 检查 | 验证本地路径存在且是目录 |

---

## 4. 涉及文件清单

### 修改

| 文件 | 改动 |
|------|------|
| `server/src/services/gitClone.ts` | 完全重写（34 行 → ~90 行） |

### 可选（防御加固）

| 文件 | 改动 |
|------|------|
| `server/src/routes/project.ts` | 在路由层增加 URL 格式校验（zod schema） |

---

## 5. 验收标准

| # | 验收项 | 验证方式 |
|---|--------|---------|
| 1 | 正常 HTTPS URL 克隆成功 | `cloneOrCopyProject('url', 'https://github.com/user/repo')` |
| 2 | 正常 SSH URL 克隆成功 | `cloneOrCopyProject('url', 'git@github.com:user/repo.git')` |
| 3 | 含 `;` 的 URL 被拒绝 | `cloneOrCopyProject('url', 'https://x.com/r; rm -rf /')` → throw |
| 4 | 含 `\|` 的 URL 被拒绝 | `cloneOrCopyProject('url', 'https://x.com/r \| cat /etc/passwd')` → throw |
| 5 | 含 `$()` 的 URL 被拒绝 | `cloneOrCopyProject('url', 'https://x.com/$(whoami)')` → throw |
| 6 | 本地路径 `../../etc/passwd` 被拒绝 | `cloneOrCopyProject('local', undefined, '../../etc/passwd')` → throw |
| 7 | 本地路径 `/etc/nginx` 被拒绝 | `cloneOrCopyProject('local', undefined, '/etc/nginx')` → throw |
| 8 | 代码中不再有 `exec()` 调用 | `grep -n "exec(" server/src/services/gitClone.ts` 无结果 |
| 9 | 已存在的仓库 pull 成功 | 二次调用同一 URL |

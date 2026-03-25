# 05【P1】Shell 命令注入风险（changeTracker + docConverter）

> 优先级：🟠 P1（安全）
> 发现日期：2026-03-25
> 状态：待处理

---

## 问题描述

`gitClone.ts` 的命令注入已修复（改用 `execFile` + URL 校验），但另外 2 个服务文件仍使用 `execSync()` 拼接字符串执行 shell 命令，存在命令注入风险。

### 1. `server/src/services/changeTracker.ts`

```typescript
// line 76
const output = execSync(
  `git diff --numstat ${fromRef}..${toRef}`,
  { cwd: repoPath, encoding: 'utf-8', timeout: 10000 }
);

// line 194
const lastTagRef = execSync(
  `git rev-list --tags-order-by-version --max-count=1 --exclude=${versionTag} HEAD~10..HEAD ...`,
  { cwd: repoPath, encoding: 'utf-8', timeout: 10000 }
);

// line 201
const logOutput = execSync(
  `git log ${range} --pretty=format:"%H%n%an  %ae  %ad%n%s%n%b" --date=iso`,
  { cwd: repoPath, encoding: 'utf-8', timeout: 10000 }
);
```

`fromRef`、`toRef`、`versionTag`、`range` 均为外部输入，未经过滤直接拼入 shell 命令。

### 2. `server/src/services/docConverter.ts`

```typescript
// line 253
execSync(`unzip -o "${filePath}" -d "${tmpDir}"`, { stdio: 'pipe' });
```

`filePath` 为用户上传文件路径，如果包含 `"` 或 shell 元字符可导致命令注入。

### 3. `server/src/services/codeApplicator.ts`

```typescript
// line 178
execSync('git add -A', { cwd: projectPath, ... });
// line 194
const hash = execSync('git rev-parse HEAD', { cwd: projectPath, ... });
```

这些虽然命令本身是固定的，但 `projectPath` 通过 `cwd` 传入，如果路径被污染也有风险。

## 风险

- 攻击者可通过构造恶意的 Git ref 名称（如 `; rm -rf /`）执行任意命令
- 上传恶意命名文件可通过 `unzip` 命令注入
- 危害范围：服务器文件系统读写、数据删除、代码执行

## 优化方案

### changeTracker.ts

```typescript
// 替换 execSync 为 execFileSync
import { execFileSync } from 'child_process';

// git diff
const output = execFileSync('git', ['diff', '--numstat', `${fromRef}..${toRef}`], {
  cwd: repoPath, encoding: 'utf-8', timeout: 10000
});

// git log
const logOutput = execFileSync('git', ['log', range, '--pretty=format:%H%n%an  %ae  %ad%n%s%n%b', '--date=iso'], {
  cwd: repoPath, encoding: 'utf-8', timeout: 10000
});
```

并增加 ref 名称校验：
```typescript
function validateGitRef(ref: string): void {
  if (!/^[\w\-\.\/]+$/.test(ref)) {
    throw new Error(`Invalid git ref: ${ref}`);
  }
}
```

### docConverter.ts

```typescript
// 替换 execSync 为 execFileSync
execFileSync('unzip', ['-o', filePath, '-d', tmpDir], { stdio: 'pipe' });
```

## 涉及文件

- `server/src/services/changeTracker.ts` → `execSync` → `execFileSync` + ref 校验
- `server/src/services/docConverter.ts` → `execSync` → `execFileSync`
- `server/src/services/codeApplicator.ts` → 校验 `projectPath`

## 验收标准

- [ ] 所有 `execSync` 拼接字符串替换为 `execFileSync` 参数数组
- [ ] Git ref 输入增加格式校验
- [ ] 文件路径输入增加安全检查
- [ ] 无 shell 元字符可被注入

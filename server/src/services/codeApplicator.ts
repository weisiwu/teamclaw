/**
 * LLM 代码变更解析与应用
 * 解析 LLM 返回的代码变更指令，应用到工作目录并支持 Git 提交
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, execFileSync } from 'child_process';

/**
 * Validate projectPath does not contain shell metacharacters
 */
function validateProjectPath(projectPath: string): void {
  if (/[;&|`$\\<>]/.test(projectPath)) {
    throw new Error(`Invalid projectPath: contains shell metacharacters`);
  }
}

export type CodeChangeAction = 'create' | 'modify' | 'delete';

export interface CodeChange {
  filePath: string;
  action: CodeChangeAction;
  content?: string;
  diff?: string;
}

export interface ApplyResult {
  applied: string[];
  failed: Array<{ file: string; error: string }>;
}

export interface CommitResult {
  commitHash: string;
  message: string;
  files: string[];
}

/**
 * 解析 LLM 返回内容中的代码变更
 * 支持多种格式：JSON 数组、markdown code block、纯文本
 */
export function parseChanges(llmOutput: string): CodeChange[] {
  const changes: CodeChange[] = [];

  // 尝试 JSON 格式
  const jsonMatch = llmOutput.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.filePath || item.path) {
            changes.push({
              filePath: item.filePath || item.path,
              action:
                (item.action as CodeChangeAction) || (item.type as CodeChangeAction) || 'modify',
              content: item.content || item.body,
              diff: item.diff,
            });
          }
        }
        return changes;
      }
    } catch {
      // JSON 解析失败，尝试其他格式
    }
  }

  // 尝试从 markdown 代码块中提取文件内容
  // 格式: ```文件名
  // 内容
  // ```
  const codeBlockPattern = /```([^\n]+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockPattern.exec(llmOutput)) !== null) {
    const fileName = (match[1] || '').trim();
    const content = match[2];

    // 跳过非文件块（如语言标记）
    if (!fileName || fileName.startsWith('json') || fileName.startsWith('typescript')) {
      continue;
    }

    // 尝试推断操作类型
    let action: CodeChangeAction = 'modify';
    if (llmOutput.includes(`新建文件: ${fileName}`) || llmOutput.includes(`create: ${fileName}`)) {
      action = 'create';
    } else if (
      llmOutput.includes(`删除文件: ${fileName}`) ||
      llmOutput.includes(`delete: ${fileName}`)
    ) {
      action = 'delete';
    }

    changes.push({ filePath: fileName, action, content });
  }

  // 尝试单个文件 JSON 对象格式
  const objMatch = llmOutput.match(/\{[\s\S]*?"filePath"[\s\S]*?\}/);
  if (objMatch && changes.length === 0) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      if (parsed.files && Array.isArray(parsed.files)) {
        for (const f of parsed.files) {
          changes.push({
            filePath: f.filePath || f.path,
            action: f.action || 'modify',
            content: f.content,
          });
        }
      }
    } catch {
      // 解析失败
    }
  }

  return changes;
}

/**
 * 将代码变更应用到工作目录
 */
export async function applyChanges(
  projectPath: string,
  changes: CodeChange[],
  dryRun: boolean = false
): Promise<ApplyResult> {
  const applied: string[] = [];
  const failed: Array<{ file: string; error: string }> = [];

  for (const change of changes) {
    const filePath = path.resolve(projectPath, change.filePath);
    const dir = path.dirname(filePath);

    try {
      // 安全检查：确保文件在项目目录内
      if (!filePath.startsWith(path.resolve(projectPath))) {
        failed.push({ file: change.filePath, error: '路径安全检查失败：不允许修改项目外部文件' });
        continue;
      }

      if (dryRun) {
        applied.push(change.filePath);
        continue;
      }

      switch (change.action) {
        case 'create':
        case 'modify': {
          // 确保目录存在
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(filePath, change.content || '', 'utf-8');
          applied.push(change.filePath);
          break;
        }
        case 'delete': {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          applied.push(change.filePath);
          break;
        }
      }
    } catch (err) {
      failed.push({ file: change.filePath, error: String(err) });
    }
  }

  return { applied, failed };
}

/**
 * 提交变更到 Git
 * @returns commit hash
 */
export async function commitChanges(
  projectPath: string,
  message: string,
  authorName?: string,
  authorEmail?: string
): Promise<CommitResult> {
  validateProjectPath(projectPath);
  try {
    // 添加所有变更
    execFileSync('git', ['add', '-A'], { cwd: projectPath, encoding: 'utf-8', stdio: 'pipe' });

    // 配置 author（如果提供）
    const env: Record<string, string> = {};
    if (authorName) env.GIT_AUTHOR_NAME = authorName;
    if (authorEmail) env.GIT_AUTHOR_EMAIL = authorEmail;

    // 执行 commit — 使用 execFileSync 避免 shell 注入
    execFileSync('git', ['commit', '-m', message], {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: 'pipe',
      env: { ...process.env, ...env },
    });

    // 获取 commit hash
    const hash = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: 'pipe',
    })
      .toString()
      .trim();

    // 获取本次提交涉及的文件
    const files = execFileSync('git', ['diff', '--name-only', 'HEAD~1..HEAD'], {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: 'pipe',
    })
      .toString()
      .split('\n')
      .filter(Boolean);

    return { commitHash: hash, message, files };
  } catch (err) {
    throw new Error(`Git commit failed: ${err}`);
  }
}

/**
 * 检查工作目录是否有未提交的变更
 */
export function hasUncommittedChanges(projectPath: string): boolean {
  validateProjectPath(projectPath);
  try {
    const result = execFileSync('git', ['status', '--porcelain'], {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return result.toString().trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * 获取当前工作目录的 Git 状态摘要
 */
export function getGitStatus(projectPath: string): string {
  validateProjectPath(projectPath);
  try {
    return execFileSync('git', ['status', '--short'], {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).toString();
  } catch {
    return '';
  }
}

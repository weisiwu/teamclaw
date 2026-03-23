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

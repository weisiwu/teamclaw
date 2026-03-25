/**
 * Git 实验分支管理服务
 * 自动创建实验分支、commit、keep/discard 管理
 *
 * 借鉴 autoresearch 的 git 分支实验模式：
 * - 实验在专用分支上进行：experiment/{tag}
 * - keep：保留 commit，推进分支
 * - discard：git reset --hard 回到上一个 keep 点
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ========== 类型定义 ==========

export interface GitExperimentBranch {
  branchName: string;
  baseBranch: string;
  projectPath: string;
  createdAt: string;
}

export interface GitCommitInfo {
  hash: string;        // 短哈希（7位）
  fullHash: string;    // 完整哈希
  message: string;
  author: string;
  date: string;
}

export interface GitExperimentState {
  branchName: string;
  lastKeepCommit: string;   // 上一个 keep 的 commit hash
  currentCommit: string;    // 当前 commit hash
  totalCommits: number;
}

// ========== Git 命令执行 ==========

async function gitExec(cmd: string, cwd: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`git ${cmd}`, {
      cwd,
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });
    return stdout.trim();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Git command failed: git ${cmd}\n${message}`);
  }
}

// ========== 分支管理 ==========

/**
 * 获取当前分支名
 */
export async function getCurrentBranch(projectPath: string): Promise<string> {
  return gitExec('rev-parse --abbrev-ref HEAD', projectPath);
}

/**
 * 获取当前 commit 短哈希
 */
export async function getCurrentCommitHash(projectPath: string): Promise<string> {
  return gitExec('rev-parse --short=7 HEAD', projectPath);
}

/**
 * 获取当前 commit 完整哈希
 */
export async function getCurrentCommitFullHash(projectPath: string): Promise<string> {
  return gitExec('rev-parse HEAD', projectPath);
}

/**
 * 检查工作区是否干净
 */
export async function isWorkingTreeClean(projectPath: string): Promise<boolean> {
  const status = await gitExec('status --porcelain', projectPath);
  return status === '';
}

/**
 * 检查分支是否存在
 */
export async function branchExists(projectPath: string, branchName: string): Promise<boolean> {
  try {
    await gitExec(`rev-parse --verify ${branchName}`, projectPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 创建实验分支
 * 从当前分支创建 experiment/{tag} 分支并切换
 */
export async function createExperimentBranch(
  projectPath: string,
  sessionTag: string
): Promise<GitExperimentBranch> {
  const branchName = `experiment/${sessionTag}`;
  const baseBranch = await getCurrentBranch(projectPath);

  // 检查工作区是否干净
  const clean = await isWorkingTreeClean(projectPath);
  if (!clean) {
    throw new Error('Working tree is not clean. Please commit or stash changes first.');
  }

  // 检查分支是否已存在
  const exists = await branchExists(projectPath, branchName);
  if (exists) {
    throw new Error(`Branch ${branchName} already exists. Use a different session tag.`);
  }

  // 创建并切换到实验分支
  await gitExec(`checkout -b ${branchName}`, projectPath);

  return {
    branchName,
    baseBranch,
    projectPath,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 切换到指定分支
 */
export async function checkoutBranch(projectPath: string, branchName: string): Promise<void> {
  await gitExec(`checkout ${branchName}`, projectPath);
}

/**
 * 暂存所有变更并提交
 */
export async function commitAll(
  projectPath: string,
  message: string
): Promise<GitCommitInfo> {
  // 暂存所有变更
  await gitExec('add -A', projectPath);

  // 检查是否有变更
  const status = await gitExec('status --porcelain', projectPath);
  if (status === '') {
    throw new Error('No changes to commit');
  }

  // 提交
  await gitExec(`commit -m "${message.replace(/"/g, '\\"')}"`, projectPath);

  // 获取 commit 信息
  const hash = await getCurrentCommitHash(projectPath);
  const fullHash = await getCurrentCommitFullHash(projectPath);
  const date = await gitExec('log -1 --format=%ci', projectPath);
  const author = await gitExec('log -1 --format=%an', projectPath);

  return { hash, fullHash, message, author, date };
}

/**
 * Keep 操作：保留当前 commit，记录为 keep 点
 * 返回当前 commit hash 作为新的 keep 点
 */
export async function keepCurrentCommit(projectPath: string): Promise<string> {
  return getCurrentCommitHash(projectPath);
}

/**
 * Discard 操作：回滚到指定的 keep 点
 * 使用 git reset --hard 丢弃实验修改
 */
export async function discardToCommit(
  projectPath: string,
  targetCommitHash: string
): Promise<void> {
  await gitExec(`reset --hard ${targetCommitHash}`, projectPath);
}

/**
 * 获取两个 commit 之间的 diff 统计
 */
export async function getDiffStats(
  projectPath: string,
  fromCommit: string,
  toCommit?: string
): Promise<string> {
  const to = toCommit || 'HEAD';
  return gitExec(`diff --stat ${fromCommit}..${to}`, projectPath);
}

/**
 * 获取实验分支的完整状态
 */
export async function getExperimentState(
  projectPath: string,
  branchName: string,
  lastKeepCommit: string
): Promise<GitExperimentState> {
  const currentCommit = await getCurrentCommitHash(projectPath);

  // 计算从基础到当前的 commit 数量
  const countStr = await gitExec(
    `rev-list --count ${lastKeepCommit}..HEAD`,
    projectPath
  ).catch(() => '0');
  const totalCommits = parseInt(countStr, 10);

  return {
    branchName,
    lastKeepCommit,
    currentCommit,
    totalCommits,
  };
}

/**
 * 获取实验分支的 commit 日志
 */
export async function getExperimentLog(
  projectPath: string,
  limit: number = 20
): Promise<GitCommitInfo[]> {
  const log = await gitExec(
    `log --oneline -n ${limit} --format="%H|%h|%s|%an|%ci"`,
    projectPath
  );

  if (!log) return [];

  return log.split('\n').map(line => {
    const [fullHash, hash, message, author, date] = line.split('|');
    return { hash, fullHash, message, author, date };
  });
}

/**
 * 清理实验分支（切回基础分支并删除实验分支）
 */
export async function cleanupExperimentBranch(
  projectPath: string,
  branchName: string,
  baseBranch: string
): Promise<void> {
  // 切回基础分支
  await gitExec(`checkout ${baseBranch}`, projectPath);

  // 删除实验分支
  await gitExec(`branch -D ${branchName}`, projectPath);
}

/**
 * 合并实验分支到基础分支
 */
export async function mergeExperimentBranch(
  projectPath: string,
  branchName: string,
  baseBranch: string,
  squash: boolean = false
): Promise<GitCommitInfo> {
  // 切到基础分支
  await gitExec(`checkout ${baseBranch}`, projectPath);

  // 合并
  if (squash) {
    await gitExec(`merge --squash ${branchName}`, projectPath);
    return commitAll(projectPath, `experiment: merge ${branchName} (squashed)`);
  } else {
    await gitExec(`merge ${branchName} --no-ff -m "experiment: merge ${branchName}"`, projectPath);
    const hash = await getCurrentCommitHash(projectPath);
    const fullHash = await getCurrentCommitFullHash(projectPath);
    return {
      hash,
      fullHash,
      message: `experiment: merge ${branchName}`,
      author: await gitExec('log -1 --format=%an', projectPath),
      date: await gitExec('log -1 --format=%ci', projectPath),
    };
  }
}

// ========== 导出 ==========

export const gitExperiment = {
  getCurrentBranch,
  getCurrentCommitHash,
  getCurrentCommitFullHash,
  isWorkingTreeClean,
  branchExists,
  createExperimentBranch,
  checkoutBranch,
  commitAll,
  keepCurrentCommit,
  discardToCommit,
  getDiffStats,
  getExperimentState,
  getExperimentLog,
  cleanupExperimentBranch,
  mergeExperimentBranch,
};

export default gitExperiment;

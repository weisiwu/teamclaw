/**
 * 共享资源锁管理
 * 通过文件锁机制避免多 Agent 同时访问共享资源冲突
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const LOCK_DIR = path.join(os.homedir(), ".openclaw", "locks");

// 确保锁目录存在
if (!fs.existsSync(LOCK_DIR)) {
  fs.mkdirSync(LOCK_DIR, { recursive: true });
}

// 内存锁缓存（避免重复申请）
const memoryLocks: Set<string> = new Set();

export type LockResource = "skills" | "workspace" | "memory" | "project";

/**
 * 获取资源锁路径
 */
function getLockPath(resource: LockResource): string {
  return path.join(LOCK_DIR, `${resource}.lock`);
}

/**
 * 申请资源锁（非阻塞，尝试一次）
 * @returns true=获得锁，false=被占用
 */
export function tryAcquireLock(resource: LockResource, owner?: string): boolean {
  const lockPath = getLockPath(resource);
  const ownerTag = owner || process.pid.toString();

  if (memoryLocks.has(resource)) {
    return true; // 同一进程内重复申请
  }

  try {
    if (fs.existsSync(lockPath)) {
      const content = fs.readFileSync(lockPath, "utf-8").trim();
      // 锁存在且不是自己的
      if (content !== ownerTag) {
        return false;
      }
    }
    fs.writeFileSync(lockPath, ownerTag, "utf-8");
    memoryLocks.add(resource);
    return true;
  } catch {
    return false;
  }
}

/**
 * 释放资源锁
 */
export function releaseLock(resource: LockResource): boolean {
  const lockPath = getLockPath(resource);
  memoryLocks.delete(resource);
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查资源是否被锁定
 */
export function isLocked(resource: LockResource): boolean {
  const lockPath = getLockPath(resource);
  if (!fs.existsSync(lockPath)) return false;
  const content = fs.readFileSync(lockPath, "utf-8").trim();
  return memoryLocks.has(resource) || content !== "";
}

/**
 * 获取锁持有者
 */
export function getLockOwner(resource: LockResource): string | null {
  const lockPath = getLockPath(resource);
  if (!fs.existsSync(lockPath)) return null;
  return fs.readFileSync(lockPath, "utf-8").trim() || null;
}

/**
 * 列出所有锁
 */
export function listAllLocks(): { resource: LockResource; owner: string | null; isLocked: boolean }[] {
  const resources: LockResource[] = ["skills", "workspace", "memory", "project"];
  return resources.map((r) => ({
    resource: r,
    owner: getLockOwner(r),
    isLocked: isLocked(r),
  }));
}

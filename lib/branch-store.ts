/**
 * Shared branch store — single source of truth for branch data.
 * Replaces duplicated branchStore logic in route files.
 */

export interface GitBranch {
  id: string;
  name: string;
  isMain: boolean;
  isRemote: boolean;
  isProtected: boolean;
  createdAt: string;
  lastCommitAt: string;
  commitMessage: string;
  author: string;
  versionId?: string;
  description?: string;
}

// Global in-memory store (persists for server lifetime)
const branchStore = new Map<string, GitBranch>();
let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;
  const now = new Date().toISOString();
  const main: GitBranch = {
    id: "branch_local_1",
    name: "main",
    isMain: true,
    isRemote: false,
    isProtected: true,
    createdAt: "2026-01-01T08:00:00Z",
    lastCommitAt: now,
    commitMessage: "Initial commit",
    author: "system",
  };
  branchStore.set(main.id, main);
  branchStore.set("main", main);
}

export function getBranch(id: string): GitBranch | undefined {
  ensureInit();
  return branchStore.get(id) || branchStore.get(id.replace(/%2F/g, "/"));
}

export function getBranchByName(name: string): GitBranch | undefined {
  ensureInit();
  for (const b of branchStore.values()) {
    if (b.name === name) return b;
  }
  return undefined;
}

export function getAllBranches(): GitBranch[] {
  ensureInit();
  return Array.from(branchStore.values()).filter(b => !b.name.startsWith("branch_local_"));
}

/** Includes internal entries like branch_local_1 (used for resetting isMain state) */
export function getAllBranchesRaw(): GitBranch[] {
  ensureInit();
  return Array.from(branchStore.values());
}

export function createBranch(data: {
  name: string;
  author?: string;
  versionId?: string;
  baseBranch?: string;
  description?: string;
}): GitBranch {
  ensureInit();
  const now = new Date().toISOString();
  const id = `branch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const branch: GitBranch = {
    id,
    name: data.name,
    isMain: false,
    isRemote: false,
    isProtected: false,
    createdAt: now,
    lastCommitAt: now,
    commitMessage: data.description || `Create branch ${data.name}`,
    author: data.author || "user",
    versionId: data.versionId,
    description: data.description,
  };
  branchStore.set(id, branch);
  branchStore.set(data.name, branch);
  return branch;
}

export function updateBranch(id: string, data: Partial<GitBranch>): GitBranch {
  ensureInit();
  const branch = getBranch(id);
  if (!branch) throw new Error("Branch not found");
  Object.assign(branch, data);
  branchStore.set(branch.id, branch);
  if (branch.name) branchStore.set(branch.name, branch);
  return branch;
}

export function deleteBranch(id: string): { deleted: boolean } {
  ensureInit();
  const branch = getBranch(id);
  if (!branch) return { deleted: false };
  if (branch.isProtected) throw new Error("Cannot delete protected branch");
  if (branch.isMain) throw new Error("Cannot delete main branch");
  branchStore.delete(branch.id);
  branchStore.delete(branch.name);
  return { deleted: true };
}

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getBranch,
  getBranchByName,
  getAllBranches,
  getAllBranchesRaw,
  createBranch,
  updateBranch,
  deleteBranch,
} from '@/lib/branch-store';

// Note: branch-store uses a global in-memory store.
// Tests share the same store instance, so we design tests to be order-independent.

describe('branch-store', () => {
  describe('getBranch', () => {
    it('returns main branch by id after initialization', () => {
      const branch = getBranch('branch_local_1');
      expect(branch).toBeDefined();
      expect(branch?.name).toBe('main');
      expect(branch?.isMain).toBe(true);
      expect(branch?.isProtected).toBe(true);
    });

    it('returns main branch by name', () => {
      const branch = getBranch('main');
      expect(branch).toBeDefined();
      expect(branch?.name).toBe('main');
    });

    it('handles URL-encoded slashes in branch names', () => {
      // A branch with a slash in the name would be URL-encoded as %2F
      const branch = getBranch('feature%2Fmy-branch');
      // Should return undefined since no such branch exists
      expect(branch).toBeUndefined();
    });

    it('returns undefined for non-existent branch', () => {
      const branch = getBranch('non-existent-branch');
      expect(branch).toBeUndefined();
    });
  });

  describe('getBranchByName', () => {
    it('returns main branch by name', () => {
      const branch = getBranchByName('main');
      expect(branch).toBeDefined();
      expect(branch?.name).toBe('main');
      expect(branch?.isMain).toBe(true);
    });

    it('returns undefined for non-existent branch name', () => {
      const branch = getBranchByName('non-existent');
      expect(branch).toBeUndefined();
    });
  });

  describe('getAllBranches', () => {
    it('excludes internal branch_local_* entries', () => {
      const branches = getAllBranches();
      const localEntries = branches.filter(b => b.name.startsWith('branch_local_'));
      expect(localEntries).toHaveLength(0);
    });

    it('includes at least the main branch', () => {
      const branches = getAllBranches();
      const mainBranch = branches.find(b => b.name === 'main');
      expect(mainBranch).toBeDefined();
    });
  });

  describe('getAllBranchesRaw', () => {
    it('includes all branches including raw/internal entries', () => {
      const raw = getAllBranchesRaw();
      // Should contain at least the main branch plus any created in other tests
      expect(raw.length).toBeGreaterThanOrEqual(1);
    });

    it('includes all branches plus internal entries', () => {
      const raw = getAllBranchesRaw();
      const filtered = getAllBranches();
      expect(raw.length).toBeGreaterThanOrEqual(filtered.length);
    });
  });

  describe('createBranch', () => {
    it('creates a new branch with default values', () => {
      const branch = createBranch({ name: 'feature/test-branch' });
      expect(branch).toBeDefined();
      expect(branch.name).toBe('feature/test-branch');
      expect(branch.isMain).toBe(false);
      expect(branch.isRemote).toBe(false);
      expect(branch.isProtected).toBe(false);
      expect(branch.author).toBe('user');
    });

    it('creates a branch with custom author', () => {
      const branch = createBranch({ name: 'feature/custom-author', author: 'alice' });
      expect(branch.author).toBe('alice');
    });

    it('creates a branch with versionId', () => {
      const branch = createBranch({ name: 'feature/with-version', versionId: 'v1.0.0' });
      expect(branch.versionId).toBe('v1.0.0');
    });

    it('creates a branch with description', () => {
      const branch = createBranch({
        name: 'feature/with-desc',
        description: 'This is a test branch',
      });
      expect(branch.description).toBe('This is a test branch');
      expect(branch.commitMessage).toBe('This is a test branch');
    });

    it('creates a branch with default commit message when no description', () => {
      const branch = createBranch({ name: 'feature/no-desc' });
      expect(branch.commitMessage).toBe('Create branch feature/no-desc');
    });

    it('can be retrieved by id after creation', () => {
      const created = createBranch({ name: 'feature/ retrievable' });
      const retrieved = getBranch(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('can be retrieved by name after creation', () => {
      const created = createBranch({ name: 'feature/named-branch-' + Date.now() });
      const retrieved = getBranchByName(created.name);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe(created.name);
    });

    it('assigns a branch_ prefixed id', () => {
      const branch = createBranch({ name: 'feature/id-test' });
      expect(branch.id).toMatch(/^branch_/);
    });
  });

  describe('updateBranch', () => {
    it('updates branch properties', () => {
      const created = createBranch({ name: 'feature/to-update' });
      const updated = updateBranch(created.id, { description: 'Updated description' });
      expect(updated.description).toBe('Updated description');
    });

    it('can update isRemote flag', () => {
      const created = createBranch({ name: 'feature/remote-test' });
      expect(created.isRemote).toBe(false);
      const updated = updateBranch(created.id, { isRemote: true });
      expect(updated.isRemote).toBe(true);
    });

    it('can update isProtected flag', () => {
      const created = createBranch({ name: 'feature/protected-test' });
      expect(created.isProtected).toBe(false);
      const updated = updateBranch(created.id, { isProtected: true });
      expect(updated.isProtected).toBe(true);
    });

    it('throws error when updating non-existent branch', () => {
      expect(() => updateBranch('non-existent-id', { description: 'test' })).toThrow(
        'Branch not found'
      );
    });

    it('persists the update in the store', () => {
      const created = createBranch({ name: 'feature/persist-test-' + Date.now() });
      updateBranch(created.id, { commitMessage: 'New commit message' });
      const retrieved = getBranch(created.id);
      expect(retrieved?.commitMessage).toBe('New commit message');
    });
  });

  describe('deleteBranch', () => {
    it('deletes an existing non-protected branch', () => {
      const created = createBranch({ name: 'feature/to-delete' });
      const result = deleteBranch(created.id);
      expect(result.deleted).toBe(true);
      const retrieved = getBranch(created.id);
      expect(retrieved).toBeUndefined();
    });

    it('returns deleted:false when branch does not exist', () => {
      const result = deleteBranch('non-existent-branch-id');
      expect(result.deleted).toBe(false);
    });

    it('throws error when trying to delete a protected branch', () => {
      const created = createBranch({ name: 'feature/protected' });
      updateBranch(created.id, { isProtected: true });
      expect(() => deleteBranch(created.id)).toThrow('Cannot delete protected branch');
    });

    it('throws error when trying to delete the main branch', () => {
      // main branch is both isMain and isProtected, so it throws on protected check first
      expect(() => deleteBranch('main')).toThrow();
      expect(() => deleteBranch('branch_local_1')).toThrow();
    });

    it('deleted branch is not retrievable by name', () => {
      const created = createBranch({ name: 'feature/by-name-delete-' + Date.now() });
      deleteBranch(created.id);
      const retrieved = getBranchByName(created.name);
      expect(retrieved).toBeUndefined();
    });
  });
});

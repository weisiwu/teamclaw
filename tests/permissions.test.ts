import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  requirePermission,
  getAccessibleResources,
  getResourceActions,
  ROLE_PERMISSIONS,
  type Resource,
  type Action,
} from '@/lib/auth/permissions';

describe('hasPermission()', () => {
  describe('owner - full access', () => {
    it('can perform all actions on all resources', () => {
      const resources: Resource[] = ['project', 'task', 'version', 'member', 'role', 'setting', 'token', 'build', 'tag'];
      const actions: Action[] = ['create', 'read', 'update', 'delete', 'manage'];
      for (const resource of resources) {
        for (const action of actions) {
          expect(hasPermission('owner', resource, action)).toBe(true);
        }
      }
    });
  });

  describe('admin - restricted access', () => {
    it('has full CRUD+manage access to project, task, version', () => {
      const fullAccess: Resource[] = ['project', 'task', 'version'];
      const actions: Action[] = ['create', 'read', 'update', 'delete', 'manage'];
      for (const resource of fullAccess) {
        for (const action of actions) {
          expect(hasPermission('admin', resource, action)).toBe(true);
        }
      }
    });

    it('has CRUD (not manage) access to tag', () => {
      const actions: Action[] = ['create', 'read', 'update', 'delete'];
      for (const action of actions) {
        expect(hasPermission('admin', 'tag', action)).toBe(true);
      }
      expect(hasPermission('admin', 'tag', 'manage')).toBe(false);
    });

    it('has CRUD (not manage) access to build', () => {
      const actions: Action[] = ['create', 'read', 'update', 'delete'];
      for (const action of actions) {
        expect(hasPermission('admin', 'build', action)).toBe(true);
      }
      expect(hasPermission('admin', 'build', 'manage')).toBe(false);
    });

    it('cannot manage roles', () => {
      expect(hasPermission('admin', 'role', 'manage')).toBe(false);
    });

    it('can only read roles', () => {
      expect(hasPermission('admin', 'role', 'read')).toBe(true);
      expect(hasPermission('admin', 'role', 'create')).toBe(false);
      expect(hasPermission('admin', 'role', 'update')).toBe(false);
      expect(hasPermission('admin', 'role', 'delete')).toBe(false);
    });

    it('can read and update settings but not delete', () => {
      expect(hasPermission('admin', 'setting', 'read')).toBe(true);
      expect(hasPermission('admin', 'setting', 'update')).toBe(true);
      expect(hasPermission('admin', 'setting', 'delete')).toBe(false);
      expect(hasPermission('admin', 'setting', 'manage')).toBe(false);
    });

    it('cannot delete members', () => {
      expect(hasPermission('admin', 'member', 'delete')).toBe(false);
      expect(hasPermission('admin', 'member', 'manage')).toBe(false);
    });

    it('cannot create tokens with manage action', () => {
      expect(hasPermission('admin', 'token', 'manage')).toBe(false);
    });
  });

  describe('developer - read/write access', () => {
    it('can create, read, update project, task, version', () => {
      const resources: Resource[] = ['project', 'task', 'version'];
      const actions: Action[] = ['create', 'read', 'update'];
      for (const resource of resources) {
        for (const action of actions) {
          expect(hasPermission('developer', resource, action)).toBe(true);
        }
      }
    });

    it('cannot delete anything', () => {
      const resources: Resource[] = ['project', 'task', 'version', 'member', 'role', 'setting', 'token', 'build', 'tag'];
      for (const resource of resources) {
        expect(hasPermission('developer', resource, 'delete')).toBe(false);
      }
    });

    it('cannot manage anything', () => {
      const resources: Resource[] = ['project', 'task', 'version', 'member', 'role', 'setting', 'token', 'build', 'tag'];
      for (const resource of resources) {
        expect(hasPermission('developer', resource, 'manage')).toBe(false);
      }
    });

    it('can only read member and role', () => {
      expect(hasPermission('developer', 'member', 'read')).toBe(true);
      expect(hasPermission('developer', 'member', 'create')).toBe(false);
      expect(hasPermission('developer', 'role', 'read')).toBe(true);
      expect(hasPermission('developer', 'role', 'update')).toBe(false);
    });

    it('can create and read builds and tags', () => {
      expect(hasPermission('developer', 'build', 'create')).toBe(true);
      expect(hasPermission('developer', 'build', 'read')).toBe(true);
      expect(hasPermission('developer', 'build', 'update')).toBe(false);
      expect(hasPermission('developer', 'tag', 'create')).toBe(true);
      expect(hasPermission('developer', 'tag', 'read')).toBe(true);
    });

    it('cannot manage tokens', () => {
      expect(hasPermission('developer', 'token', 'create')).toBe(false);
      expect(hasPermission('developer', 'token', 'manage')).toBe(false);
    });
  });

  describe('viewer - read only', () => {
    it('can only read all basic resources', () => {
      const readOnly: Resource[] = ['project', 'task', 'version', 'member', 'role', 'setting', 'build', 'tag'];
      for (const resource of readOnly) {
        expect(hasPermission('viewer', resource, 'read')).toBe(true);
        expect(hasPermission('viewer', resource, 'create')).toBe(false);
        expect(hasPermission('viewer', resource, 'update')).toBe(false);
        expect(hasPermission('viewer', resource, 'delete')).toBe(false);
      }
    });

    it('has zero permissions on token', () => {
      const actions: Action[] = ['create', 'read', 'update', 'delete', 'manage'];
      for (const action of actions) {
        expect(hasPermission('viewer', 'token', action)).toBe(false);
      }
    });
  });

  describe('invalid inputs', () => {
    it('returns false for unknown role', () => {
      // @ts-expect-error - testing runtime behavior with invalid role
      expect(hasPermission('superadmin', 'project', 'read')).toBe(false);
    });

    it('returns false for unknown resource', () => {
      expect(hasPermission('owner', 'unknown' as Resource, 'read')).toBe(false);
    });

    it('returns false for unknown action', () => {
      expect(hasPermission('owner', 'project', 'unknown' as Action)).toBe(false);
    });
  });
});

describe('requirePermission()', () => {
  it('does not throw for allowed action', () => {
    expect(() => requirePermission('owner', 'project', 'delete')).not.toThrow();
    expect(() => requirePermission('developer', 'project', 'create')).not.toThrow();
    expect(() => requirePermission('viewer', 'project', 'read')).not.toThrow();
  });

  it('throws for denied action', () => {
    expect(() => requirePermission('viewer', 'token', 'read')).toThrow('Permission denied');
    expect(() => requirePermission('developer', 'role', 'delete')).toThrow('Permission denied');
  });

  it('throws with correct message format', () => {
    try {
      requirePermission('viewer', 'token', 'create');
    } catch (e: any) {
      expect(e.message).toBe('Permission denied: viewer cannot create token');
    }
  });
});

describe('getAccessibleResources()', () => {
  it('owner can access all 9 resources', () => {
    const resources = getAccessibleResources('owner');
    expect(resources).toHaveLength(9);
  });

  it('admin can access all 9 resources', () => {
    const resources = getAccessibleResources('admin');
    expect(resources).toHaveLength(9);
  });

  it('developer can access 7 resources (no member/role beyond read)', () => {
    const resources = getAccessibleResources('developer');
    // member and role only have 'read', but still returned as accessible
    expect(resources).toContain('project');
    expect(resources).toContain('task');
    expect(resources).toContain('version');
    expect(resources).toContain('member');
    expect(resources).toContain('role');
  });

  it('viewer can access all resources (all have at least read)', () => {
    const resources = getAccessibleResources('viewer');
    // Even viewer has read on most things; token has zero actions
    expect(resources).not.toContain('token');
    expect(resources).toContain('project');
    expect(resources).toContain('task');
  });

  it('excludes resources with zero actions', () => {
    const resources = getAccessibleResources('viewer');
    expect(resources).not.toContain('token');
  });
});

describe('getResourceActions()', () => {
  it('owner gets all 5 actions for each resource', () => {
    const actions = getResourceActions('owner', 'project');
    expect(actions).toEqual(['create', 'read', 'update', 'delete', 'manage']);
  });

  it('admin gets correct actions for role resource', () => {
    const actions = getResourceActions('admin', 'role');
    expect(actions).toEqual(['read']);
  });

  it('developer gets only create/read/update for project', () => {
    const actions = getResourceActions('developer', 'project');
    expect(actions).toEqual(['create', 'read', 'update']);
  });

  it('viewer gets only read for project', () => {
    const actions = getResourceActions('viewer', 'project');
    expect(actions).toEqual(['read']);
  });

  it('viewer gets empty array for token', () => {
    const actions = getResourceActions('viewer', 'token');
    expect(actions).toEqual([]);
  });

  it('returns empty array for unknown resource', () => {
    const actions = getResourceActions('owner', 'unknown' as Resource);
    expect(actions).toEqual([]);
  });
});

describe('ROLE_PERMISSIONS matrix integrity', () => {
  it('each role has exactly 9 resource rules', () => {
    for (const role of ['owner', 'admin', 'developer', 'viewer'] as const) {
      expect(ROLE_PERMISSIONS[role]).toHaveLength(9);
    }
  });

  it('all roles have the same 9 resources', () => {
    const resources = ROLE_PERMISSIONS.owner.map(r => r.resource);
    expect(resources).toEqual([
      'project', 'task', 'version', 'member', 'role',
      'setting', 'token', 'build', 'tag',
    ]);
    for (const role of ['admin', 'developer', 'viewer'] as const) {
      const roleResources = ROLE_PERMISSIONS[role].map(r => r.resource);
      expect(roleResources).toEqual(resources);
    }
  });
});

import { describe, it, expect } from 'vitest';
import {
  ROLES,
  getRoleById,
  canManageRole,
  isOwner,
  isAdmin,
  ROLE_OPTIONS,
  type Role,
} from '@/lib/auth/roles';

describe('ROLES - Role definitions', () => {
  it('contains all four roles', () => {
    expect(ROLES).toHaveProperty('owner');
    expect(ROLES).toHaveProperty('admin');
    expect(ROLES).toHaveProperty('developer');
    expect(ROLES).toHaveProperty('viewer');
  });

  it('owner has highest privilege level (0)', () => {
    expect(ROLES.owner.level).toBe(0);
    expect(ROLES.owner.label).toBe('Owner');
    expect(ROLES.owner.labelZh).toBe('所有者');
  });

  it('admin has level 1', () => {
    expect(ROLES.admin.level).toBe(1);
    expect(ROLES.admin.label).toBe('Admin');
  });

  it('developer has level 2', () => {
    expect(ROLES.developer.level).toBe(2);
    expect(ROLES.developer.label).toBe('Developer');
  });

  it('viewer has lowest privilege level (3)', () => {
    expect(ROLES.viewer.level).toBe(3);
    expect(ROLES.viewer.label).toBe('Viewer');
  });

  it('levels are strictly ordered', () => {
    expect(ROLES.owner.level).toBeLessThan(ROLES.admin.level);
    expect(ROLES.admin.level).toBeLessThan(ROLES.developer.level);
    expect(ROLES.developer.level).toBeLessThan(ROLES.viewer.level);
  });

  it('each role has required properties', () => {
    const requiredProps = ['id', 'label', 'labelZh', 'description', 'level', 'color'];
    for (const role of Object.values(ROLES)) {
      for (const prop of requiredProps) {
        expect(role).toHaveProperty(prop);
      }
    }
  });

  it('role ids match their keys', () => {
    for (const [key, role] of Object.entries(ROLES)) {
      expect(role.id).toBe(key);
    }
  });

  it('color values start with bg- (Tailwind classes)', () => {
    for (const role of Object.values(ROLES)) {
      expect(role.color).toMatch(/^bg-/);
    }
  });
});

describe('Role type coverage', () => {
  it('Role type includes all role keys', () => {
    const roles: Role[] = ['owner', 'admin', 'developer', 'viewer'];
    expect(roles).toHaveLength(4);
  });
});

describe('getRoleById()', () => {
  it('returns correct role definition for valid role id', () => {
    expect(getRoleById('owner').level).toBe(0);
    expect(getRoleById('admin').level).toBe(1);
    expect(getRoleById('developer').level).toBe(2);
    expect(getRoleById('viewer').level).toBe(3);
  });

  it('falls back to viewer for unknown role id', () => {
    // @ts-expect-error - testing runtime behavior with invalid role
    const result = getRoleById('superadmin');
    expect(result.id).toBe('viewer');
  });

  it('falls back to viewer for null/undefined', () => {
    // @ts-expect-error - testing runtime behavior
    expect(getRoleById(null).id).toBe('viewer');
    // @ts-expect-error - testing runtime behavior
    expect(getRoleById(undefined).id).toBe('viewer');
  });
});

describe('canManageRole()', () => {
  it('owner can manage all other roles', () => {
    expect(canManageRole('owner', 'admin')).toBe(true);
    expect(canManageRole('owner', 'developer')).toBe(true);
    expect(canManageRole('owner', 'viewer')).toBe(true);
  });

  it('admin can manage developer and viewer but not owner', () => {
    expect(canManageRole('admin', 'developer')).toBe(true);
    expect(canManageRole('admin', 'viewer')).toBe(true);
    expect(canManageRole('admin', 'owner')).toBe(false);
  });

  it('developer can manage viewer but not admin or owner', () => {
    expect(canManageRole('developer', 'viewer')).toBe(true);
    expect(canManageRole('developer', 'admin')).toBe(false);
    expect(canManageRole('developer', 'owner')).toBe(false);
  });

  it('viewer cannot manage anyone', () => {
    expect(canManageRole('viewer', 'owner')).toBe(false);
    expect(canManageRole('viewer', 'admin')).toBe(false);
    expect(canManageRole('viewer', 'developer')).toBe(false);
    expect(canManageRole('viewer', 'viewer')).toBe(false);
  });

  it('no role can manage itself at same level', () => {
    expect(canManageRole('owner', 'owner')).toBe(false);
    expect(canManageRole('admin', 'admin')).toBe(false);
  });
});

describe('isOwner()', () => {
  it('returns true only for owner role', () => {
    expect(isOwner('owner')).toBe(true);
    expect(isOwner('admin')).toBe(false);
    expect(isOwner('developer')).toBe(false);
    expect(isOwner('viewer')).toBe(false);
  });
});

describe('isAdmin()', () => {
  it('returns true for owner and admin', () => {
    expect(isAdmin('owner')).toBe(true);
    expect(isAdmin('admin')).toBe(true);
  });

  it('returns false for developer and viewer', () => {
    expect(isAdmin('developer')).toBe(false);
    expect(isAdmin('viewer')).toBe(false);
  });
});

describe('ROLE_OPTIONS', () => {
  it('contains all four role definitions', () => {
    expect(ROLE_OPTIONS).toHaveLength(4);
    const ids = ROLE_OPTIONS.map(r => r.id);
    expect(ids).toContain('owner');
    expect(ids).toContain('admin');
    expect(ids).toContain('developer');
    expect(ids).toContain('viewer');
  });
});

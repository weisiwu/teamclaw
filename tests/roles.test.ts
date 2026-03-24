import { describe, it, expect } from 'vitest';
import {
  ROLES,
  getRoleById,
  canManageRole,
  isAdmin,
  isElevatedRole,
  ROLE_OPTIONS,
  ROLE_LABELS,
  ROLE_COLORS,
  type Role,
} from '@/lib/auth/roles';

describe('ROLES - Role definitions', () => {
  it('contains all three roles: admin, vice_admin, member', () => {
    expect(ROLES).toHaveProperty('admin');
    expect(ROLES).toHaveProperty('vice_admin');
    expect(ROLES).toHaveProperty('member');
  });

  it('admin has highest privilege level (0)', () => {
    expect(ROLES.admin.level).toBe(0);
    expect(ROLES.admin.label).toBe('Admin');
    expect(ROLES.admin.labelZh).toBe('管理员');
  });

  it('vice_admin has level 1', () => {
    expect(ROLES.vice_admin.level).toBe(1);
    expect(ROLES.vice_admin.label).toBe('Vice Admin');
    expect(ROLES.vice_admin.labelZh).toBe('副管理员');
  });

  it('member has lowest privilege level (2)', () => {
    expect(ROLES.member.level).toBe(2);
    expect(ROLES.member.label).toBe('Member');
    expect(ROLES.member.labelZh).toBe('普通员工');
  });

  it('levels are strictly ordered: admin < vice_admin < member', () => {
    expect(ROLES.admin.level).toBeLessThan(ROLES.vice_admin.level);
    expect(ROLES.vice_admin.level).toBeLessThan(ROLES.member.level);
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
  it('Role type includes all three role keys', () => {
    const roles: Role[] = ['admin', 'vice_admin', 'member'];
    expect(roles).toHaveLength(3);
  });
});

describe('getRoleById()', () => {
  it('returns correct role definition for valid role id', () => {
    expect(getRoleById('admin').level).toBe(0);
    expect(getRoleById('vice_admin').level).toBe(1);
    expect(getRoleById('member').level).toBe(2);
  });

  it('falls back to member for unknown role id', () => {
    // @ts-expect-error - testing runtime behavior with invalid role
    const result = getRoleById('superadmin');
    expect(result.id).toBe('member');
  });

  it('falls back to member for null/undefined', () => {
    // @ts-expect-error - testing runtime behavior
    expect(getRoleById(null).id).toBe('member');
    // @ts-expect-error - testing runtime behavior
    expect(getRoleById(undefined).id).toBe('member');
  });
});

describe('canManageRole()', () => {
  it('admin can manage vice_admin and member', () => {
    expect(canManageRole('admin', 'vice_admin')).toBe(true);
    expect(canManageRole('admin', 'member')).toBe(true);
    expect(canManageRole('admin', 'admin')).toBe(false); // cannot manage self
  });

  it('vice_admin can manage member but not admin', () => {
    expect(canManageRole('vice_admin', 'member')).toBe(true);
    expect(canManageRole('vice_admin', 'admin')).toBe(false);
    expect(canManageRole('vice_admin', 'vice_admin')).toBe(false); // cannot manage self
  });

  it('member cannot manage anyone', () => {
    expect(canManageRole('member', 'admin')).toBe(false);
    expect(canManageRole('member', 'vice_admin')).toBe(false);
    expect(canManageRole('member', 'member')).toBe(false);
  });

  it('no role can manage itself at same level', () => {
    expect(canManageRole('admin', 'admin')).toBe(false);
    expect(canManageRole('vice_admin', 'vice_admin')).toBe(false);
    expect(canManageRole('member', 'member')).toBe(false);
  });
});

describe('isAdmin()', () => {
  it('returns true only for admin role', () => {
    expect(isAdmin('admin')).toBe(true);
    expect(isAdmin('vice_admin')).toBe(false);
    expect(isAdmin('member')).toBe(false);
  });
});

describe('isElevatedRole()', () => {
  it('returns true for admin and vice_admin', () => {
    expect(isElevatedRole('admin')).toBe(true);
    expect(isElevatedRole('vice_admin')).toBe(true);
    expect(isElevatedRole('member')).toBe(false);
  });
});

describe('ROLE_OPTIONS', () => {
  it('contains all three role definitions', () => {
    expect(ROLE_OPTIONS).toHaveLength(3);
    const ids = ROLE_OPTIONS.map(r => r.id);
    expect(ids).toContain('admin');
    expect(ids).toContain('vice_admin');
    expect(ids).toContain('member');
  });
});

describe('ROLE_LABELS', () => {
  it('has Chinese labels for all roles', () => {
    expect(ROLE_LABELS.admin).toBe('管理员');
    expect(ROLE_LABELS.vice_admin).toBe('副管理员');
    expect(ROLE_LABELS.member).toBe('普通员工');
  });
});

describe('ROLE_COLORS', () => {
  it('has Tailwind color classes for all roles', () => {
    expect(ROLE_COLORS.admin).toMatch(/^bg-/);
    expect(ROLE_COLORS.vice_admin).toMatch(/^bg-/);
    expect(ROLE_COLORS.member).toMatch(/^bg-/);
  });
});

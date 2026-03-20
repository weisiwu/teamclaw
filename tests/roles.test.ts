import { describe, it, expect } from 'vitest';
import { ROLES, type Role } from '@/lib/auth/roles';

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

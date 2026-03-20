/**
 * semver.test.ts — Semantic Versioning utilities tests
 * Tests for: parseSemver, formatSemver, compareVersions, isGreaterThan,
 * isLessThan, isValidSemver, versionDistance, bumpVersion, sortVersions,
 * getLatestVersion, bumpLevelFromTaskType
 */

import { describe, it, expect } from 'vitest';
import {
  parseSemver,
  formatSemver,
  compareVersions,
  isGreaterThan,
  isLessThan,
  isValidSemver,
  versionDistance,
  bumpVersion,
  sortVersions,
  getLatestVersion,
  bumpLevelFromTaskType,
  type ParsedSemver,
} from '@/server/src/services/semver.js';

describe('parseSemver', () => {
  it('parses standard version', () => {
    const result = parseSemver('1.2.3');
    expect(result).not.toBeNull();
    expect(result!.major).toBe(1);
    expect(result!.minor).toBe(2);
    expect(result!.patch).toBe(3);
    expect(result!.prerelease).toEqual([]);
    expect(result!.build).toEqual([]);
  });

  it('strips leading v', () => {
    const result = parseSemver('v2.0.0');
    expect(result).not.toBeNull();
    expect(result!.major).toBe(2);
    expect(result!.original).toBe('v2.0.0');
    expect(result!.raw).toBe('2.0.0');
  });

  it('parses prerelease version', () => {
    const result = parseSemver('1.0.0-alpha.1');
    expect(result).not.toBeNull();
    expect(result!.prerelease).toEqual(['alpha', '1']);
  });

  it('parses build metadata version', () => {
    const result = parseSemver('1.0.0+build.123');
    expect(result).not.toBeNull();
    expect(result!.build).toEqual(['build', '123']);
  });

  it('parses full version with prerelease and build', () => {
    const result = parseSemver('v2.1.0-rc.1+build.456');
    expect(result).not.toBeNull();
    expect(result!.major).toBe(2);
    expect(result!.minor).toBe(1);
    expect(result!.patch).toBe(0);
    expect(result!.prerelease).toEqual(['rc', '1']);
    expect(result!.build).toEqual(['build', '456']);
  });

  it('returns null for invalid version', () => {
    expect(parseSemver('invalid')).toBeNull();
    expect(parseSemver('1.2')).toBeNull();
    expect(parseSemver('1.2.3.4')).toBeNull();
    expect(parseSemver('')).toBeNull();
  });
});

describe('formatSemver', () => {
  it('formats with v prefix by default', () => {
    const parsed: ParsedSemver = {
      major: 1, minor: 2, patch: 3,
      prerelease: [], build: [],
      raw: '1.2.3', original: '1.2.3',
    };
    expect(formatSemver(parsed)).toBe('v1.2.3');
  });

  it('formats without v prefix when includeV=false', () => {
    const parsed: ParsedSemver = {
      major: 1, minor: 2, patch: 3,
      prerelease: [], build: [],
      raw: '1.2.3', original: '1.2.3',
    };
    expect(formatSemver(parsed, false)).toBe('1.2.3');
  });

  it('includes prerelease', () => {
    const parsed: ParsedSemver = {
      major: 1, minor: 0, patch: 0,
      prerelease: ['beta', '1'], build: [],
      raw: '1.0.0', original: 'v1.0.0-beta.1',
    };
    expect(formatSemver(parsed)).toBe('v1.0.0-beta.1');
  });

  it('includes build metadata', () => {
    const parsed: ParsedSemver = {
      major: 3, minor: 0, patch: 0,
      prerelease: [], build: ['sha', 'abc1234'],
      raw: '3.0.0', original: 'v3.0.0+sha.abc1234',
    };
    expect(formatSemver(parsed)).toBe('v3.0.0+sha.abc1234');
  });
});

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
  });

  it('returns positive when a > b', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.5.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
  });

  it('returns negative when a < b', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '1.5.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
  });

  it('handles prerelease correctly', () => {
    // Release > prerelease
    expect(compareVersions('1.0.0', '1.0.0-alpha.1')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0-alpha.1', '1.0.0')).toBeLessThan(0);
    // Compare prereleases
    expect(compareVersions('1.0.0-alpha.2', '1.0.0-alpha.1')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0-beta.1', '1.0.0-alpha.1')).toBeGreaterThan(0);
  });

  it('falls back to string compare for invalid versions', () => {
    expect(compareVersions('invalid', '1.0.0')).not.toBe(0);
  });
});

describe('isGreaterThan / isLessThan', () => {
  it('isGreaterThan returns correct boolean', () => {
    expect(isGreaterThan('2.0.0', '1.0.0')).toBe(true);
    expect(isGreaterThan('1.0.0', '2.0.0')).toBe(false);
    expect(isGreaterThan('1.0.0', '1.0.0')).toBe(false);
  });

  it('isLessThan returns correct boolean', () => {
    expect(isLessThan('1.0.0', '2.0.0')).toBe(true);
    expect(isLessThan('2.0.0', '1.0.0')).toBe(false);
    expect(isLessThan('1.0.0', '1.0.0')).toBe(false);
  });
});

describe('isValidSemver', () => {
  it('returns true for valid versions', () => {
    expect(isValidSemver('1.0.0')).toBe(true);
    expect(isValidSemver('v2.1.3')).toBe(true);
    expect(isValidSemver('0.0.1')).toBe(true);
    expect(isValidSemver('10.20.30')).toBe(true);
    expect(isValidSemver('1.0.0-alpha')).toBe(true);
    expect(isValidSemver('1.0.0+build')).toBe(true);
  });

  it('returns false for invalid versions', () => {
    expect(isValidSemver('1.0')).toBe(false);
    expect(isValidSemver('v1')).toBe(false);
    expect(isValidSemver('invalid')).toBe(false);
    expect(isValidSemver('')).toBe(false);
    expect(isValidSemver('1.2.3.4')).toBe(false);
  });
});

describe('versionDistance', () => {
  it('detects major bump distance', () => {
    const result = versionDistance('v1.0.0', 'v2.0.0');
    expect(result).not.toBeNull();
    expect(result!.level).toBe('major');
    expect(result!.distance).toBe(1);
  });

  it('detects minor bump distance', () => {
    const result = versionDistance('v1.0.0', 'v1.1.0');
    expect(result).not.toBeNull();
    expect(result!.level).toBe('minor');
    expect(result!.distance).toBe(1);
  });

  it('detects patch bump distance', () => {
    const result = versionDistance('v1.0.0', 'v1.0.1');
    expect(result).not.toBeNull();
    expect(result!.level).toBe('patch');
  });

  it('returns null for invalid input', () => {
    expect(versionDistance('invalid', 'v1.0.0')).toBeNull();
    expect(versionDistance('v1.0.0', 'invalid')).toBeNull();
  });

  it('handles reverse direction', () => {
    const result = versionDistance('v2.0.0', 'v1.0.0');
    expect(result).not.toBeNull();
    expect(result!.level).toBe('major');
  });
});

describe('bumpVersion', () => {
  it('bumps major version', () => {
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0');
    expect(bumpVersion('v1.2.3', 'major')).toBe('v2.0.0');
    expect(bumpVersion('0.0.1', 'major')).toBe('1.0.0');
  });

  it('bumps minor version', () => {
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0');
    expect(bumpVersion('v1.2.3', 'minor')).toBe('v1.3.0');
  });

  it('bumps patch version', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4');
    expect(bumpVersion('v1.2.3', 'patch')).toBe('v1.2.4');
  });

  it('clears prerelease on bump', () => {
    expect(bumpVersion('1.0.0-alpha.1', 'patch')).toBe('1.0.1');
  });

  it('returns null for invalid version', () => {
    expect(bumpVersion('invalid', 'patch')).toBeNull();
  });
});

describe('sortVersions', () => {
  it('sorts descending (newest first)', () => {
    const input = ['v1.0.0', 'v3.0.0', 'v2.0.0'];
    expect(sortVersions(input)).toEqual(['v3.0.0', 'v2.0.0', 'v1.0.0']);
  });

  it('handles mixed v-prefix and no-prefix', () => {
    const input = ['1.0.0', 'v2.0.0', '0.9.0'];
    expect(sortVersions(input)).toEqual(['v2.0.0', '1.0.0', '0.9.0']);
  });

  it('does not mutate original array', () => {
    const input = ['v1.0.0', 'v2.0.0'];
    sortVersions(input);
    expect(input).toEqual(['v1.0.0', 'v2.0.0']);
  });
});

describe('getLatestVersion', () => {
  it('returns latest from list', () => {
    expect(getLatestVersion(['v1.0.0', 'v3.0.0', 'v2.0.0'])).toBe('v3.0.0');
  });

  it('handles single element', () => {
    expect(getLatestVersion(['v1.0.0'])).toBe('v1.0.0');
  });

  it('returns null for empty list', () => {
    expect(getLatestVersion([])).toBeNull();
  });
});

describe('bumpLevelFromTaskType', () => {
  it('maps feature/feat to minor', () => {
    expect(bumpLevelFromTaskType('feature')).toBe('minor');
    expect(bumpLevelFromTaskType('feat')).toBe('minor');
    expect(bumpLevelFromTaskType('新功能')).toBe('minor');
  });

  it('maps fix/bug to patch', () => {
    expect(bumpLevelFromTaskType('fix')).toBe('patch');
    expect(bumpLevelFromTaskType('bugfix')).toBe('patch');
    expect(bumpLevelFromTaskType('修复')).toBe('patch');
  });

  it('maps breaking to major', () => {
    expect(bumpLevelFromTaskType('breaking')).toBe('major');
    expect(bumpLevelFromTaskType('breaking-change')).toBe('major');
  });

  it('defaults to patch', () => {
    expect(bumpLevelFromTaskType('unknown')).toBe('patch');
    expect(bumpLevelFromTaskType('')).toBe('patch');
  });
});

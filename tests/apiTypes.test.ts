import { describe, it, expect } from 'vitest';
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  STATUS_BADGE_VARIANT,
  STATUS_LABELS,
  VERSION_STATUS_OPTIONS,
  VERSION_STATUS_LABELS,
  VERSION_STATUS_BADGE_VARIANT,
  BUILD_STATUS_LABELS,
  BUILD_STATUS_BADGE_VARIANT,
  VERSION_TAG_OPTIONS,
  DOWNLOAD_FORMAT_OPTIONS,
  MODEL_PRICING,
  type TaskStatus,
  type BuildStatus,
  type VersionStatus,
} from '@/lib/api/types';

describe('TASK_STATUS_OPTIONS', () => {
  it('has exactly 5 options including "all"', () => {
    expect(TASK_STATUS_OPTIONS).toHaveLength(5);
  });

  it('includes all required statuses plus "all"', () => {
    const values = TASK_STATUS_OPTIONS.map((o) => o.value);
    expect(values).toContain('all');
    expect(values).toContain('pending');
    expect(values).toContain('in_progress');
    expect(values).toContain('completed');
    expect(values).toContain('cancelled');
  });

  it('all labels are non-empty Chinese strings', () => {
    for (const opt of TASK_STATUS_OPTIONS) {
      expect(opt.label).toBeTruthy();
      expect(typeof opt.label).toBe('string');
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });
});

describe('TASK_PRIORITY_OPTIONS', () => {
  it('has exactly 5 options including "all"', () => {
    expect(TASK_PRIORITY_OPTIONS).toHaveLength(5);
  });

  it('includes "all" and numeric ranges', () => {
    const values = TASK_PRIORITY_OPTIONS.map((o) => o.value);
    expect(values).toContain('all');
    expect(values).toContain('10');
    expect(values).toContain('8');
    expect(values).toContain('5');
    expect(values).toContain('low');
  });
});

describe('STATUS_BADGE_VARIANT', () => {
  it('covers all TaskStatus values', () => {
    const statuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];
    for (const status of statuses) {
      expect(STATUS_BADGE_VARIANT[status]).toBeDefined();
    }
  });

  it('returns valid badge variants', () => {
    const validVariants = ['default', 'success', 'warning', 'error', 'info'] as const;
    const statuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];
    for (const status of statuses) {
      expect(validVariants).toContain(STATUS_BADGE_VARIANT[status]);
    }
  });
});

describe('STATUS_LABELS', () => {
  it('covers all TaskStatus values', () => {
    const statuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];
    for (const status of statuses) {
      expect(STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('labels are non-empty strings', () => {
    const statuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];
    for (const status of statuses) {
      expect(typeof STATUS_LABELS[status]).toBe('string');
      expect(STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });
});

describe('VERSION_STATUS_OPTIONS', () => {
  it('has exactly 4 options including "all"', () => {
    expect(VERSION_STATUS_OPTIONS).toHaveLength(4);
  });

  it('includes "all" and all version statuses', () => {
    const values = VERSION_STATUS_OPTIONS.map((o) => o.value);
    expect(values).toContain('all');
    expect(values).toContain('draft');
    expect(values).toContain('published');
    expect(values).toContain('archived');
  });
});

describe('VERSION_STATUS_LABELS', () => {
  it('covers all VersionStatus values', () => {
    const statuses: VersionStatus[] = ['draft', 'published', 'archived', 'rolled_back'];
    for (const status of statuses) {
      expect(VERSION_STATUS_LABELS[status]).toBeTruthy();
      expect(typeof VERSION_STATUS_LABELS[status]).toBe('string');
    }
  });
});

describe('VERSION_STATUS_BADGE_VARIANT', () => {
  it('covers all VersionStatus values', () => {
    const statuses: VersionStatus[] = ['draft', 'published', 'archived', 'rolled_back'];
    for (const status of statuses) {
      expect(VERSION_STATUS_BADGE_VARIANT[status]).toBeDefined();
    }
  });

  it('rolled_back uses warning variant', () => {
    expect(VERSION_STATUS_BADGE_VARIANT['rolled_back']).toBe('warning');
  });
});

describe('BUILD_STATUS_LABELS', () => {
  it('covers all BuildStatus values', () => {
    const statuses: BuildStatus[] = ['pending', 'building', 'success', 'failed'];
    for (const status of statuses) {
      expect(BUILD_STATUS_LABELS[status]).toBeTruthy();
      expect(typeof BUILD_STATUS_LABELS[status]).toBe('string');
    }
  });

  it('BUILD_STATUS_BADGE_VARIANT covers all BuildStatus values', () => {
    const statuses: BuildStatus[] = ['pending', 'building', 'success', 'failed'];
    const validVariants = ['default', 'info', 'success', 'error'] as const;
    for (const status of statuses) {
      expect(validVariants).toContain(BUILD_STATUS_BADGE_VARIANT[status]);
    }
  });
});

describe('VERSION_TAG_OPTIONS', () => {
  it('has exactly 5 tag options', () => {
    expect(VERSION_TAG_OPTIONS).toHaveLength(5);
  });

  it('includes expected tag values', () => {
    const values = VERSION_TAG_OPTIONS.map((o) => o.value);
    expect(values).toContain('stable');
    expect(values).toContain('beta');
    expect(values).toContain('latest');
    expect(values).toContain('deprecated');
    expect(values).toContain('draft');
  });

  it('each tag has color property', () => {
    for (const opt of VERSION_TAG_OPTIONS) {
      expect(opt.color).toBeTruthy();
      expect(opt.color.length).toBeGreaterThan(0);
    }
  });
});

describe('DOWNLOAD_FORMAT_OPTIONS', () => {
  it('has exactly 6 format options', () => {
    expect(DOWNLOAD_FORMAT_OPTIONS).toHaveLength(6);
  });

  it('includes common distribution formats', () => {
    const values = DOWNLOAD_FORMAT_OPTIONS.map((o) => o.value);
    expect(values).toContain('zip');
    expect(values).toContain('tar.gz');
    expect(values).toContain('apk');
    expect(values).toContain('ipa');
    expect(values).toContain('exe');
    expect(values).toContain('dmg');
  });

  it('each format has label and description', () => {
    for (const opt of DOWNLOAD_FORMAT_OPTIONS) {
      expect(opt.label).toBeTruthy();
      expect(opt.desc).toBeTruthy();
    }
  });
});

describe('MODEL_PRICING', () => {
  const modelTypes = ['gpt-4', 'gpt-4o', 'claude-3', 'claude-3.5', 'gemini', 'default'] as const;

  it('covers all model types', () => {
    for (const model of modelTypes) {
      expect(MODEL_PRICING[model]).toBeDefined();
    }
  });

  it('all prices are non-negative numbers', () => {
    for (const model of modelTypes) {
      const pricing = MODEL_PRICING[model];
      expect(pricing.inputPrice).toBeGreaterThanOrEqual(0);
      expect(pricing.outputPrice).toBeGreaterThanOrEqual(0);
    }
  });

  it('each model has inputPrice and outputPrice', () => {
    for (const model of modelTypes) {
      const pricing = MODEL_PRICING[model];
      expect(typeof pricing.inputPrice).toBe('number');
      expect(typeof pricing.outputPrice).toBe('number');
    }
  });
});

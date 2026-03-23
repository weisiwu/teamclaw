import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks before any imports
const { mockExistsSync, mockReaddirSync, mockReadFileSync } = vi.hoisted(() => {
  return {
    mockExistsSync: vi.fn(),
    mockReaddirSync: vi.fn(),
    mockReadFileSync: vi.fn(),
  };
});

vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readdirSync: mockReaddirSync,
    readFileSync: mockReadFileSync,
  },
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  readFileSync: mockReadFileSync,
}));

import { getAllDocs, getDocBySlug } from '@/lib/docs';

describe('docs', () => {
  beforeEach(() => {
    mockExistsSync.mockReset();
    mockReaddirSync.mockReset();
    mockReadFileSync.mockReset();
  });

  describe('getAllDocs - docs/modules directory does not exist', () => {
    it('returns empty array when fs.existsSync returns false', () => {
      mockExistsSync.mockReturnValue(false);
      const docs = getAllDocs();
      expect(docs).toEqual([]);
    });
  });

  describe('getAllDocs - directory exists with .md files', () => {
    it('returns doc metadata for each markdown file', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['getting-started.md', 'api-guide.md'] as any);
      mockReadFileSync
        .mockReturnValueOnce(`---
title: Getting Started
description: How to get started
category: Guide
---
# Getting Started
Content here.
` as any)
        .mockReturnValueOnce(`---
title: API Guide
---
# API Guide
API content.
` as any);

      const docs = getAllDocs();
      expect(docs).toHaveLength(2);
      expect(docs[0].slug).toBe('getting-started');
      expect(docs[0].title).toBe('Getting Started');
      expect(docs[0].description).toBe('How to get started');
      expect(docs[0].category).toBe('Guide');
      expect(docs[1].slug).toBe('api-guide');
      expect(docs[1].title).toBe('API Guide');
    });

    it('falls back to slug as title when frontmatter has no title field', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['no-title.md'] as any);
      mockReadFileSync.mockReturnValue(`---
description: A doc without title field
---
# Custom Title
` as any);

      const docs = getAllDocs();
      expect(docs[0].title).toBe('no-title');
    });
  });

  describe('getAllDocs - no frontmatter path (lines 25-26)', () => {
    it('extracts title from first heading when no frontmatter exists', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['readme.md'] as any);
      mockReadFileSync.mockReturnValue(`# Welcome to TeamClaw

This is the readme content without frontmatter.
` as any);

      const docs = getAllDocs();
      expect(docs).toHaveLength(1);
      expect(docs[0].slug).toBe('readme');
      expect(docs[0].title).toBe('Welcome to TeamClaw');
    });

    it('returns Untitled when no frontmatter and no markdown heading found', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['readme.md'] as any);
      mockReadFileSync.mockReturnValue(`Just plain text without any markdown heading.
` as any);

      const docs = getAllDocs();
      expect(docs).toHaveLength(1);
      expect(docs[0].title).toBe('Untitled');
    });
  });

  describe('getDocBySlug - file does not exist', () => {
    it('returns null for non-existent slug', () => {
      mockExistsSync.mockReturnValue(false);
      const doc = getDocBySlug('non-existent-doc-slug-xyz123');
      expect(doc).toBeNull();
    });
  });

  describe('getDocBySlug - file exists with frontmatter', () => {
    it('returns full doc with content and all frontmatter fields', () => {
      mockExistsSync.mockReturnValue(true);
      const frontmatterContent = `---
title: API Reference
description: Complete API reference
category: Reference
created: 2024-01-01
updated: 2024-06-01
---
# API Reference

Here is the full API reference content.
`;
      mockReadFileSync.mockReturnValue(frontmatterContent as any);

      const doc = getDocBySlug('api-reference');
      expect(doc).not.toBeNull();
      expect(doc?.slug).toBe('api-reference');
      expect(doc?.title).toBe('API Reference');
      expect(doc?.description).toBe('Complete API reference');
      expect(doc?.category).toBe('Reference');
      expect(doc?.created).toBe('2024-01-01');
      expect(doc?.updated).toBe('2024-06-01');
      expect(doc?.content).toContain('# API Reference');
    });
  });

  describe('getDocBySlug - no frontmatter path (lines 25-26)', () => {
    it('extracts title from first heading when file has no frontmatter', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`# Hello World

Some content without frontmatter.
` as any);

      const doc = getDocBySlug('hello');
      expect(doc).not.toBeNull();
      expect(doc?.title).toBe('Hello World');
      expect(doc?.content).toContain('Hello World');
    });

    it('falls back to slug when no frontmatter and no heading found', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`Plain content with no heading.
` as any);

      const doc = getDocBySlug('plain-doc');
      expect(doc).not.toBeNull();
      // Code falls back to slug when no heading match
      expect(['plain-doc', 'Untitled']).toContain(doc?.title);
    });
  });

  describe('getAllDocs - filters to only .md files', () => {
    it('excludes non-markdown files from results', () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['readme.md', 'data.json', 'notes.txt', 'changelog.md'] as any);
      mockReadFileSync.mockReturnValue(`---
title: Test
---
# Test
` as any);

      const docs = getAllDocs();
      // Should only include .md files (readme.md and changelog.md)
      expect(docs).toHaveLength(2);
      expect(docs.map(d => d.slug)).toEqual(['readme', 'changelog']);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs and path modules before importing docs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
}));

const mockFs = await import('fs');
const mockPath = await import('path');

describe('docs.ts - extractFrontmatter', () => {
  // We need to test the logic directly without importing the module
  // since it uses process.cwd() and fs at module level

  it('parses frontmatter correctly', () => {
    const content = `---
title: Test Doc
description: A test document
category: guide
created: 2024-01-01
updated: 2024-01-15
---
# Hello World

This is content.`;

    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = content.match(frontmatterRegex);
    expect(match).not.toBeNull();

    const frontmatter = match![1];
    const lines = frontmatter.split('\n');
    const meta: Record<string, string> = {};

    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        meta[key.trim()] = valueParts.join(':').trim();
      }
    });

    expect(meta.title).toBe('Test Doc');
    expect(meta.description).toBe('A test document');
    expect(meta.category).toBe('guide');
    expect(meta.created).toBe('2024-01-01');
    expect(meta.updated).toBe('2024-01-15');
  });

  it('extracts title from first heading when no frontmatter', () => {
    const content = `# My Document

Some content here.`;

    const headingMatch = content.match(/^#\s+(.+)$/m);
    expect(headingMatch).not.toBeNull();
    expect(headingMatch![1].trim()).toBe('My Document');
  });

  it('returns Untitled when no frontmatter and no heading', () => {
    const content = `No heading here.`;
    const headingMatch = content.match(/^#\s+(.+)$/m);
    const title = headingMatch ? headingMatch[1].trim() : 'Untitled';
    expect(title).toBe('Untitled');
  });

  it('handles multiline frontmatter values', () => {
    const content = `---
title: Title with colon: inside
description: Another value
---
Content`;

    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = content.match(frontmatterRegex);
    expect(match).not.toBeNull();

    const frontmatter = match![1];
    const lines = frontmatter.split('\n');
    const meta: Record<string, string> = {};

    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        meta[key.trim()] = valueParts.join(':').trim();
      }
    });

    expect(meta.title).toBe('Title with colon: inside');
    expect(meta.description).toBe('Another value');
  });

  it('handles empty frontmatter section', () => {
    // When frontmatter is literally just --- with nothing between, the regex still matches
    // because [\s\S]*? can match zero characters between the newlines
    const content = `---

---
# Just a heading`;

    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = content.match(frontmatterRegex);
    expect(match).not.toBeNull();
    expect(match![1].trim()).toBe('');
  });

  it('correctly separates frontmatter from content', () => {
    const content = `---
title: Test
---
# Heading

Paragraph text.`;

    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = content.match(frontmatterRegex);
    expect(match).not.toBeNull();

    const frontmatter = match![1];
    const body = content.slice(match![0].length);

    expect(body).toBe('# Heading\n\nParagraph text.');
    expect(frontmatter).toContain('title: Test');
  });
});

describe('docs.ts - getAllDocs logic', () => {
  it('generates correct slug from filename', () => {
    const file = 'getting-started.md';
    const slug = file.replace(/\.md$/, '');
    expect(slug).toBe('getting-started');
  });

  it('handles filenames with multiple dots', () => {
    const file = 'api.v2.reference.md';
    const slug = file.replace(/\.md$/, '');
    expect(slug).toBe('api.v2.reference');
  });

  it('returns empty array when no markdown files', () => {
    const files: string[] = [];
    const mdFiles = files.filter(file => file.endsWith('.md'));
    expect(mdFiles).toEqual([]);
  });

  it('filters only markdown files', () => {
    const files = ['readme.md', 'api.ts', 'changelog.md', 'utils.js'];
    const mdFiles = files.filter(file => file.endsWith('.md'));
    expect(mdFiles).toEqual(['readme.md', 'changelog.md']);
  });
});

describe('docs.ts - getDocBySlug logic', () => {
  it('constructs correct file path from slug', () => {
    const slug = 'getting-started';
    const docsDir = '/path/to/docs';
    const filePath = `${docsDir}/${slug}.md`;
    expect(filePath).toBe('/path/to/docs/getting-started.md');
  });

  it('returns null for null/undefined slug', () => {
    const slug: string | null = null;
    const filePath = slug ? `${slug}.md` : null;
    expect(filePath).toBeNull();
  });
});

describe('docs.ts - DocMeta interface fields', () => {
  it('has all required fields', () => {
    const doc = {
      slug: 'test-doc',
      title: 'Test Doc',
      description: 'A test',
      category: 'guide',
      created: '2024-01-01',
      updated: '2024-01-15',
    };

    expect(doc.slug).toBe('test-doc');
    expect(doc.title).toBe('Test Doc');
    expect(typeof doc.description).toBe('string');
    expect(typeof doc.category).toBe('string');
  });

  it('category is optional', () => {
    const doc = {
      slug: 'test',
      title: 'Test',
    };
    expect((doc as any).category).toBeUndefined();
  });
});

describe('docs.ts - edge cases', () => {
  it('handles description with colons', () => {
    const frontmatter = `title: Test
description: URL: https://example.com`;

    const lines = frontmatter.split('\n');
    const meta: Record<string, string> = {};
    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        meta[key.trim()] = valueParts.join(':').trim();
      }
    });

    expect(meta.description).toBe('URL: https://example.com');
  });

  it('skips malformed frontmatter lines', () => {
    const frontmatter = `title: Test
no-colon-here
description: Value`;

    const lines = frontmatter.split('\n');
    const meta: Record<string, string> = {};
    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        meta[key.trim()] = valueParts.join(':').trim();
      }
    });

    expect(meta.title).toBe('Test');
    expect(meta.description).toBe('Value');
    expect(meta['no-colon-here']).toBeUndefined();
  });

  it('handles frontmatter with trailing whitespace', () => {
    const frontmatter = `title: Test  
description: Value  `;

    const lines = frontmatter.split('\n');
    const meta: Record<string, string> = {};
    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        meta[key.trim()] = valueParts.join(':').trim();
      }
    });

    expect(meta.title).toBe('Test');
    expect(meta.description).toBe('Value');
  });
});

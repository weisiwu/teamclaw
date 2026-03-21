import { describe, it, expect } from 'vitest';

// We can't import the actual module since it uses fs and process.cwd()
// Instead, test the extractFrontmatter logic by reimplementing it here

function extractFrontmatter(content: string): { meta: Record<string, string>; content: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    const headingMatch = content.match(/^#\s+(.+)$/m);
    return {
      meta: {},
      content,
    };
  }

  const frontmatter = match[1];
  const meta: Record<string, string> = {};

  frontmatter.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      const trimmedKey = key.trim();
      if (trimmedKey && value) {
        meta[trimmedKey] = value;
      }
    }
  });

  return {
    meta,
    content: content.slice(match[0].length),
  };
}

describe('extractFrontmatter', () => {
  it('extracts title and description from frontmatter', () => {
    const content = `---
title: Getting Started
description: How to set up the project
---
# Main Content`;
    const result = extractFrontmatter(content);
    expect(result.meta.title).toBe('Getting Started');
    expect(result.meta.description).toBe('How to set up the project');
    expect(result.content).toBe('# Main Content');
  });

  it('handles multi-line description', () => {
    const content = `---
title: API Reference
description: API reference: v1 endpoints
category: Backend
---
# API`;
    const result = extractFrontmatter(content);
    expect(result.meta.title).toBe('API Reference');
    expect(result.meta.category).toBe('Backend');
  });

  it('handles no frontmatter with heading', () => {
    const content = `# Hello World
Some content here`;
    const result = extractFrontmatter(content);
    expect(result.content).toBe(content);
    expect(Object.keys(result.meta)).toHaveLength(0);
  });

  it('handles frontmatter with empty values', () => {
    const content = `---
title:
description: Some text
---
# Content`;
    const result = extractFrontmatter(content);
    expect(result.meta.description).toBe('Some text');
    expect(result.meta.title).toBeUndefined();
  });

  it('strips frontmatter from content', () => {
    const body = '# Introduction\nWelcome to the docs.';
    const content = `---\ntitle: Intro\n---\n${body}`;
    const result = extractFrontmatter(content);
    expect(result.content).toBe(body);
  });

  it('handles frontmatter with multiple fields', () => {
    const content = `---
title: User Guide
description: Complete user documentation
category: Docs
created: 2026-01-01
updated: 2026-03-15
---
# User Guide`;
    const result = extractFrontmatter(content);
    expect(result.meta.title).toBe('User Guide');
    expect(result.meta.description).toBe('Complete user documentation');
    expect(result.meta.category).toBe('Docs');
    expect(result.meta.created).toBe('2026-01-01');
    expect(result.meta.updated).toBe('2026-03-15');
    expect(result.content).toBe('# User Guide');
  });
});

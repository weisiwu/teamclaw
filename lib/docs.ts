import fs from 'fs';
import path from 'path';

const docsDirectory = path.join(process.cwd(), 'docs/modules');

export interface DocMeta {
  slug: string;
  title: string;
  description?: string;
  category?: string;
  created?: string;
  updated?: string;
}

export interface Doc extends DocMeta {
  content: string;
}

function extractFrontmatter(content: string): { meta: Partial<DocMeta>; content: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    // No frontmatter, extract title from first heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    return {
      meta: {
        title: headingMatch ? headingMatch[1].trim() : 'Untitled',
      },
      content,
    };
  }

  const frontmatter = match[1];
  const meta: Partial<DocMeta> = {};

  frontmatter.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      const trimmedKey = key.trim();
      if (trimmedKey === 'title') meta.title = value;
      if (trimmedKey === 'description') meta.description = value;
      if (trimmedKey === 'category') meta.category = value;
      if (trimmedKey === 'created') meta.created = value;
      if (trimmedKey === 'updated') meta.updated = value;
    }
  });

  return {
    meta,
    content: content.slice(match[0].length),
  };
}

export function getAllDocs(): DocMeta[] {
  if (!fs.existsSync(docsDirectory)) {
    return [];
  }

  const files = fs.readdirSync(docsDirectory).filter(file => file.endsWith('.md'));

  return files.map(file => {
    const slug = file.replace(/\.md$/, '');
    const filePath = path.join(docsDirectory, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { meta } = extractFrontmatter(content);

    return {
      slug,
      title: meta.title || slug,
      description: meta.description || '',
      category: meta.category,
      created: meta.created,
      updated: meta.updated,
    };
  });
}

export function getDocBySlug(slug: string): Doc | null {
  const filePath = path.join(docsDirectory, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { meta } = extractFrontmatter(content);

  return {
    slug,
    title: meta.title || slug,
    description: meta.description || '',
    category: meta.category,
    created: meta.created,
    updated: meta.updated,
    content,
  };
}

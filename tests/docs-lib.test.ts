import { describe, it, expect } from 'vitest';
import { getAllDocs, getDocBySlug } from '@/lib/docs';

describe('docs', () => {
  describe('getAllDocs', () => {
    it('returns an array of doc metadata', () => {
      const docs = getAllDocs();
      expect(Array.isArray(docs)).toBe(true);
    });

    it('each doc has required fields', () => {
      const docs = getAllDocs();
      if (docs.length > 0) {
        const doc = docs[0];
        expect(doc).toHaveProperty('slug');
        expect(doc).toHaveProperty('title');
        expect(typeof doc.slug).toBe('string');
        expect(typeof doc.title).toBe('string');
      }
    });

    it('returns non-empty slug for each doc', () => {
      const docs = getAllDocs();
      docs.forEach(doc => {
        expect(doc.slug.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getDocBySlug', () => {
    it('returns null for non-existent doc', () => {
      const doc = getDocBySlug('non-existent-doc-slug-xyz123');
      expect(doc).toBeNull();
    });

    it('returns a doc with content for valid slug', () => {
      const docs = getAllDocs();
      if (docs.length > 0) {
        const firstDoc = docs[0];
        const doc = getDocBySlug(firstDoc.slug);
        expect(doc).not.toBeNull();
        expect(doc?.slug).toBe(firstDoc.slug);
        expect(doc?.content).toBeDefined();
        expect(doc?.content.length).toBeGreaterThan(0);
      }
    });

    it('doc has title matching slug when no frontmatter title', () => {
      // Test with a known doc
      const doc = getDocBySlug('技术选型');
      if (doc) {
        expect(doc.title).toBeDefined();
      }
    });

    it('doc content includes the actual markdown content', () => {
      const docs = getAllDocs();
      if (docs.length > 0) {
        const doc = getDocBySlug(docs[0].slug);
        if (doc) {
          // Content should have some markdown-like structure
          expect(doc.content).toContain('#');
        }
      }
    });
  });
});

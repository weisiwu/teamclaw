import { getAllDocs } from '@/lib/docs';
import DocsPageClient from './DocsPageClient';

export default function DocsPage() {
  const docs = getAllDocs();

  return <DocsPageClient initialDocs={docs} />;
}

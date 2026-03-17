import { getAllDocs } from '@/lib/docs';
import DocsPageClient from './DocsPageClient';

export default function DocsPage() {
  const docs = getAllDocs();

  // Calculate statistics
  const totalDocs = docs.length;
  
  // Calculate weekly updates (updated within last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const weeklyUpdates = docs.filter(doc => {
    if (!doc.updated) return false;
    const updatedDate = new Date(doc.updated);
    return updatedDate >= oneWeekAgo;
  }).length;

  // Get unique categories - filter out undefined first, then create set
  const categorySet = new Set<string>();
  docs.forEach(doc => {
    if (doc.category) {
      categorySet.add(doc.category);
    }
  });
  const categories = Array.from(categorySet);

  return (
    <DocsPageClient 
      initialDocs={docs} 
      stats={{ totalDocs, weeklyUpdates, categories }} 
    />
  );
}

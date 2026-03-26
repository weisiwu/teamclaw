import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { getDocBySlug, getAllDocs } from '@/lib/docs';
import DownloadButton from '../components/DownloadButton';
import 'highlight.js/styles/github-dark.css';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const docs = getAllDocs();
  return docs.map((doc) => ({ slug: doc.slug }));
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/docs" className="hover:text-gray-900 dark:hover:text-white dark:text-white transition-colors">
          文档中心
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">{doc.title}</span>
      </nav>

      {/* Title with download button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{doc.title}</h1>
        <DownloadButton slug={slug} title={doc.title} />
      </div>

      {/* Content */}
      <article className="prose prose-gray max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, rehypeSlug]}
        >
          {doc.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}

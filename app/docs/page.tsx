import Link from 'next/link';
import { getAllDocs } from '@/lib/docs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function DocsPage() {
  const docs = getAllDocs();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">文档中心</h1>
      
      {docs.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          <p>暂无文档</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <Link key={doc.slug} href={`/docs/${doc.slug}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">{doc.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {doc.description || '点击查看详情'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

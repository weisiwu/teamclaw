import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * GET /api/download
 * 下载文档文件
 * Query: slug - 文件slug（不含.md后缀）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json(
      { code: 400, message: 'Missing slug parameter' },
      { status: 400 }
    );
  }

  // 安全检查：只允许字母、数字、连字符、下划线
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return NextResponse.json(
      { code: 400, message: 'Invalid slug format' },
      { status: 400 }
    );
  }

  const docsDirectory = path.join(process.cwd(), 'docs/modules');
  const filePath = path.join(docsDirectory, `${slug}.md`);

  try {
    // 使用 async fs，避免 Next.js App Router 中的 sync I/O 警告
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return NextResponse.json(
        { code: 404, message: 'Document not found' },
        { status: 404 }
      );
    }

    const content = await fs.readFile(filePath, 'utf-8');

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slug}.md"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { code: 404, message: 'Document not found' },
        { status: 404 }
      );
    }
    console.error('[Download] Error:', error);
    return NextResponse.json(
      { code: 500, message: 'Failed to read document' },
      { status: 500 }
    );
  }
}

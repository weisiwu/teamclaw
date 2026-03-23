import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import {
  checkRateLimit,
  getRateLimitIdentifier,
  corsHeaders,
  generateRequestId,
} from '@/lib/api-shared';

/**
 * GET /api/download
 * 下载文档文件
 * Query: slug - 文件slug（不含.md后缀）
 * Rate limited: 30 req/min per IP (public tier)
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("X-Request-ID") || generateRequestId();

  // Apply public rate limiting
  const { allowed, resetMs } = checkRateLimit(
    getRateLimitIdentifier(request),
    "public"
  );
  if (!allowed) {
    return NextResponse.json(
      {
        code: 429,
        message: `请求过于频繁，请 ${Math.ceil(resetMs / 1000)} 秒后重试`,
        requestId,
        remaining: 0,
      },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Retry-After": String(Math.ceil(resetMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json(
      { code: 400, message: 'Missing slug parameter', requestId },
      { status: 400 }
    );
  }

  // 安全检查：只允许字母、数字、连字符、下划线
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return NextResponse.json(
      { code: 400, message: 'Invalid slug format', requestId },
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
        { code: 404, message: 'Document not found', requestId },
        { status: 404 }
      );
    }

    const content = await fs.readFile(filePath, 'utf-8');

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slug}.md"`,
        'Cache-Control': 'private, max-age=3600',
        'X-Request-ID': requestId,
      },
    });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { code: 404, message: 'Document not found', requestId },
        { status: 404 }
      );
    }
    console.error('[Download] Error:', error);
    return NextResponse.json(
      { code: 500, message: 'Failed to read document', requestId },
      { status: 500 }
    );
  }
}

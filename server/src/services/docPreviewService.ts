/**
 * Doc Preview Service - Unified document preview for PDF/Word/Excel/Code/Markdown
 * Uses pdf-lib for PDF rendering,复用 docConverter for other formats
 */

import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import { getFilePreview, codeToHtml, markdownToHtml } from './docConverter.js';
import { docService } from './docService.js';
import { DocPreviewResult } from '../models/download.js';

const MAX_PREVIEW_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CODE_LINES = 500;
const MAX_TEXT_SIZE = 512 * 1024; // 512KB for text files

const CODE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift', '.scala',
  '.c', '.cpp', '.cc', '.h', '.hpp', '.cs', '.php', '.pl',
  '.sh', '.bash', '.zsh', '.fish', '.sql', '.graphql', '.gql',
  '.json', '.yaml', '.yml', '.xml', '.toml', '.ini', '.conf',
  '.html', '.css', '.scss', '.less', '.sass',
  '.md', '.rst', '.adoc',
  '.dockerfile', '.tf', '.hcl', '.env',
  '.diff', '.patch', '.gitignore', '.editorconfig',
  '.csv', '.log', '.txt',
];

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];

const PREVIEWABLE_TEXT = ['.md', '.txt', '.rst', '.adoc', '.json', '.yaml', '.yml', '.xml', '.toml', '.ini', '.conf', '.env', '.gitignore', '.editorconfig', '.csv'];

/**
 * Generate a unified preview for any document
 */
export async function generatePreview(
  docId: string,
  options?: { page?: number; maxLines?: number }
): Promise<DocPreviewResult> {
  const doc = docService.getDoc(docId);
  if (!doc) {
    return { type: 'unsupported', size: 0, canPreview: false, message: '文档不存在' };
  }

  const filePath = docService.getDocFilePath(docId);
  if (!filePath || !fs.existsSync(filePath)) {
    return { type: 'unsupported', size: doc.size, canPreview: false, message: '文件路径不可用' };
  }

  const ext = path.extname(doc.name).toLowerCase();
  const basename = doc.name.toLowerCase();

  // Check file size
  if (doc.size > MAX_PREVIEW_SIZE) {
    return {
      type: 'unsupported',
      size: doc.size,
      canPreview: false,
      url: `/api/v1/docs/${docId}/download`,
      message: `文件过大 (${formatSize(doc.size)}), 最大支持 ${formatSize(MAX_PREVIEW_SIZE)} 预览`,
    };
  }

  // PDF preview
  if (ext === '.pdf' || basename.endsWith('.pdf')) {
    return await generatePdfPreview(filePath, doc.size, options?.page);
  }

  // Image preview
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return {
      type: 'image',
      url: `/api/v1/docs/${docId}/download`,
      size: doc.size,
      canPreview: true,
      filename: doc.name,
    };
  }

  // Markdown / text files
  if (PREVIEWABLE_TEXT.includes(ext) || ext === '.md') {
    return generateTextPreview(filePath, doc.size, ext, doc.name);
  }

  // Code files
  if (CODE_EXTENSIONS.includes(ext) || isCodeFilename(basename)) {
    return generateCodePreview(filePath, doc.size, doc.name, options?.maxLines);
  }

  // Word / Excel - return download URL
  if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext)) {
    return {
      type: 'unsupported',
      url: `/api/v1/docs/${docId}/download`,
      size: doc.size,
      canPreview: false,
      message: `${ext.toUpperCase()} 格式暂不支持在线预览，请下载后查看`,
    };
  }

  // Try generic HTML preview via docConverter
  const html = getFilePreview(filePath);
  if (html) {
    return {
      type: 'html',
      content: html,
      size: doc.size,
      canPreview: true,
    };
  }

  return {
    type: 'unsupported',
    url: `/api/v1/docs/${docId}/download`,
    size: doc.size,
    canPreview: false,
    message: '该文件类型不支持在线预览',
  };
}

/**
 * Generate PDF preview with page info
 */
async function generatePdfPreview(
  filePath: string,
  size: number,
  page?: number
): Promise<DocPreviewResult> {
  try {
    const buffer = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();

    if (page && page > pageCount) {
      return {
        type: 'pdf',
        size,
        canPreview: false,
        message: `PDF 共有 ${pageCount} 页，请求的页码超出范围`,
      };
    }

    return {
      type: 'pdf',
      url: `/api/v1/docs/${path.basename(filePath, '.pdf')}/pdf${page ? `?page=${page}` : ''}`,
      pages: pageCount,
      currentPage: page || 1,
      size,
      canPreview: true,
      filename: path.basename(filePath),
    };
  } catch (err: any) {
    return {
      type: 'unsupported',
      size,
      canPreview: false,
      message: `PDF 解析失败: ${err?.message || '文件可能已损坏'}`,
    };
  }
}

/**
 * Generate text/markdown preview as HTML
 */
function generateTextPreview(
  filePath: string,
  size: number,
  ext: string,
  filename: string
): DocPreviewResult {
  try {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      content = '[二进制文件，无法预览]';
    }

    const maxChars = MAX_TEXT_SIZE;
    if (content.length > maxChars) {
      content = content.slice(0, maxChars) + '\n\n... (内容截断，超出预览限制)';
    }

    let htmlContent: string;
    if (ext === '.md') {
      htmlContent = markdownToHtml(content, filename);
    } else {
      const escaped = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${filename}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #333; background: #fafafa; }
  pre { white-space: pre-wrap; word-wrap: break-word; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e5e5e5; font-size: 14px; }
  .filename { background: #f0f0f0; padding: 8px 16px; border-radius: 6px 6px 0 0; font-size: 12px; color: #666; border: 1px solid #e5e5e5; border-bottom: none; }
  .ext-badge { background: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px; }
</style>
</head>
<body>
<div class="filename">${filename}<span class="ext-badge">${ext.toUpperCase().slice(1)}</span></div>
<pre>${escaped}</pre>
</body>
</html>`;
    }

    return {
      type: 'html',
      content: htmlContent,
      size,
      canPreview: true,
      filename,
    };
  } catch (err: any) {
    return {
      type: 'unsupported',
      size,
      canPreview: false,
      message: `文件读取失败: ${err?.message}`,
    };
  }
}

/**
 * Generate syntax-highlighted code preview
 */
function generateCodePreview(
  filePath: string,
  size: number,
  filename: string,
  maxLines?: number
): DocPreviewResult {
  try {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return {
        type: 'unsupported',
        size,
        canPreview: false,
        message: '无法读取文件内容',
      };
    }

    const lines = content.split('\n');
    const limit = maxLines || MAX_CODE_LINES;
    const truncated = lines.length > limit;
    const displayContent = lines.slice(0, limit).join('\n') + (truncated ? `\n\n// ... 还有 ${lines.length - limit} 行未显示` : '');

    const html = codeToHtml(filename, displayContent);
    const enhancedHtml = html.replace('<title>', `<title>${filename} - `).replace('</title>', ` (${lines.length} lines)</title>`);

    return {
      type: 'code',
      content: enhancedHtml,
      size,
      canPreview: true,
      filename,
    };
  } catch (err: any) {
    return {
      type: 'unsupported',
      size,
      canPreview: false,
      message: `代码预览失败: ${err?.message}`,
    };
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function isCodeFilename(name: string): boolean {
  return name === 'dockerfile' || name === 'makefile' || name === 'cmakelists.txt' ||
    name === 'nginx.conf' || name === '.gitignore' || name === '.editorconfig';
}

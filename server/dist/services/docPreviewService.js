/**
 * Doc Preview Service - Document preview generation for various file types
 */
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
// File type detection
const CODE_EXTENSIONS = new Set([
    'js', 'ts', 'jsx', 'tsx', 'json', 'md', 'py', 'rb', 'go', 'rs', 'java',
    'cpp', 'c', 'h', 'hpp', 'cs', 'php', 'swift', 'kt', 'scala', 'r', 'sql',
    'sh', 'bash', 'zsh', 'yaml', 'yml', 'xml', 'css', 'scss', 'less', 'html',
    'htm', 'vue', 'svelte', 'dart', 'lua', 'perl', 'groovy', 'dockerfile',
    'dockerignore', 'gitignore', 'env', 'ini', 'conf', 'cfg', 'toml',
]);
const IMAGE_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico',
]);
const PREVIEW_CONFIG = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedTypes: ['md', 'txt', 'pdf', 'code', 'image', 'html'],
    pdfRenderDpi: 150,
    codePreviewLines: 500,
};
// Syntax highlighting helper
function getLanguageFromExt(ext) {
    const langMap = {
        js: 'javascript',
        ts: 'typescript',
        jsx: 'jsx',
        tsx: 'tsx',
        py: 'python',
        rb: 'ruby',
        go: 'go',
        rs: 'rust',
        java: 'java',
        cpp: 'cpp',
        c: 'c',
        cs: 'csharp',
        php: 'php',
        swift: 'swift',
        kt: 'kotlin',
        scala: 'scala',
        r: 'r',
        sql: 'sql',
        sh: 'bash',
        bash: 'bash',
        yaml: 'yaml',
        yml: 'yaml',
        xml: 'xml',
        css: 'css',
        scss: 'scss',
        less: 'less',
        html: 'html',
        htm: 'html',
        vue: 'vue',
        svelte: 'svelte',
        dart: 'dart',
        lua: 'lua',
        perl: 'perl',
        dockerfile: 'dockerfile',
        md: 'markdown',
        json: 'json',
    };
    return langMap[ext] || ext;
}
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
function wrapCodeHtml(code, language) {
    const escaped = escapeHtml(code);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 16px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 13px; line-height: 1.5; background: #f8f9fa; }
    pre { margin: 0; white-space: pre-wrap; word-wrap: break-word; }
    .line { display: block; counter-increment: line; }
    .line::before { content: counter(line); display: inline-block; width: 40px; margin-right: 16px; color: #999; text-align: right; user-select: none; }
    .keyword { color: #d73a49; }
    .string { color: #032f62; }
    .comment { color: #6a737d; }
    .number { color: #005cc5; }
  </style>
</head>
<body>
  <pre>${escaped}</pre>
</body>
</html>`;
}
function markdownToHtml(markdown) {
    // Simple markdown to HTML conversion
    let html = markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold and italic
        .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        // Code blocks
        .replace(/```([\w]*)([\s\S]*?)```/gim, '<pre><code class="language-$1">$2</code></pre>')
        .replace(/`([^`]+)`/gim, '<code>$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
        // Lists
        .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/gim, '<ul>$&</ul>')
        // Paragraphs
        .replace(/\n\n/gim, '</p><p>')
        // Line breaks
        .replace(/\n/gim, '<br>');
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #24292e; max-width: 900px; margin: 0 auto; }
    h1, h2, h3 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 8px; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 8px; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { background: rgba(27,31,35,0.05); padding: 2px 6px; border-radius: 3px; font-family: 'Monaco', 'Menlo', monospace; font-size: 85%; }
    pre code { background: none; padding: 0; }
    a { color: #0366d6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { padding-left: 24px; }
    li { margin: 4px 0; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}
// PDF Preview
async function renderPdfPreview(filePath, pageNum = 1) {
    try {
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pageCount = pdfDoc.getPageCount();
        // For now, return metadata and let frontend use react-pdf for rendering
        // In production, you might want to render to images server-side
        return {
            type: 'pdf',
            url: `/api/v1/docs/download?path=${encodeURIComponent(filePath)}`,
            pages: pageCount,
            currentPage: pageNum,
            size: pdfBuffer.length,
            canPreview: true,
            filename: path.basename(filePath),
        };
    }
    catch (err) {
        console.error('[DocPreviewService] PDF preview error:', err);
        return {
            type: 'unsupported',
            url: `/api/v1/docs/download?path=${encodeURIComponent(filePath)}`,
            size: fs.statSync(filePath).size,
            canPreview: false,
            message: '无法预览此 PDF 文件，请下载查看',
            filename: path.basename(filePath),
        };
    }
}
// Main preview function
export async function generatePreview(docId, filePath, options) {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return {
            type: 'unsupported',
            size: 0,
            canPreview: false,
            message: '文件不存在',
        };
    }
    const stat = fs.statSync(filePath);
    const size = stat.size;
    const ext = path.extname(filePath).toLowerCase().slice(1);
    // Check file size limit
    if (size > PREVIEW_CONFIG.maxFileSize) {
        return {
            type: 'unsupported',
            url: `/api/v1/docs/download?path=${encodeURIComponent(filePath)}`,
            size,
            canPreview: false,
            message: `文件过大 (${(size / 1024 / 1024).toFixed(1)}MB)，超过预览限制 (10MB)，请下载查看`,
            filename: path.basename(filePath),
        };
    }
    // Markdown files
    if (ext === 'md' || ext === 'markdown') {
        const content = fs.readFileSync(filePath, 'utf-8');
        return {
            type: 'html',
            content: markdownToHtml(content),
            size,
            canPreview: true,
            filename: path.basename(filePath),
        };
    }
    // Plain text files
    if (ext === 'txt' || ext === 'text' || ext === 'log') {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const maxLines = options?.maxLines || PREVIEW_CONFIG.codePreviewLines;
        const truncated = lines.length > maxLines;
        const displayContent = lines.slice(0, maxLines).join('\n');
        return {
            type: 'text',
            content: wrapCodeHtml(displayContent + (truncated ? '\n\n... (内容已截断)' : ''), 'text'),
            size,
            canPreview: true,
            filename: path.basename(filePath),
        };
    }
    // PDF files
    if (ext === 'pdf') {
        return await renderPdfPreview(filePath, options?.page);
    }
    // Code files
    if (CODE_EXTENSIONS.has(ext)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const maxLines = options?.maxLines || PREVIEW_CONFIG.codePreviewLines;
        const truncated = lines.length > maxLines;
        const displayContent = lines.slice(0, maxLines).join('\n');
        return {
            type: 'code',
            content: wrapCodeHtml(displayContent + (truncated ? '\n\n... (代码已截断，共 ' + lines.length + ' 行)' : ''), getLanguageFromExt(ext)),
            size,
            canPreview: true,
            filename: path.basename(filePath),
        };
    }
    // Image files
    if (IMAGE_EXTENSIONS.has(ext)) {
        return {
            type: 'image',
            url: `/api/v1/docs/download?path=${encodeURIComponent(filePath)}`,
            size,
            canPreview: true,
            filename: path.basename(filePath),
        };
    }
    // HTML files
    if (ext === 'html' || ext === 'htm') {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Return URL for iframe embedding
        return {
            type: 'html',
            url: `/api/v1/docs/download?path=${encodeURIComponent(filePath)}`,
            content,
            size,
            canPreview: true,
            filename: path.basename(filePath),
        };
    }
    // Unsupported type
    return {
        type: 'unsupported',
        url: `/api/v1/docs/download?path=${encodeURIComponent(filePath)}`,
        size,
        canPreview: false,
        message: `不支持预览 .${ext} 文件类型，请下载查看`,
        filename: path.basename(filePath),
    };
}
// Batch preview for multiple files
export async function generatePreviews(files, options) {
    const results = new Map();
    await Promise.all(files.map(async ({ docId, filePath }) => {
        try {
            const result = await generatePreview(docId, filePath, options);
            results.set(docId, result);
        }
        catch (err) {
            console.error(`[DocPreviewService] Preview failed for ${docId}:`, err);
            results.set(docId, {
                type: 'unsupported',
                size: 0,
                canPreview: false,
                message: '预览生成失败',
            });
        }
    }));
    return results;
}
// Get supported preview types
export function getSupportedPreviewTypes() {
    return PREVIEW_CONFIG.supportedTypes;
}
// Check if file type is previewable
export function isPreviewable(filePath) {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    return (ext === 'md' ||
        ext === 'txt' ||
        ext === 'pdf' ||
        ext === 'html' ||
        CODE_EXTENSIONS.has(ext) ||
        IMAGE_EXTENSIONS.has(ext));
}

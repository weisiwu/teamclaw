import fs from 'fs';
import path from 'path';

export interface ConvertedDoc {
  originalPath: string;
  convertedPath: string;
  format: string;
  title: string;
  size: number;
}

/**
 * Convert documents to HTML for online viewing
 * Step 9 of 11-step import: 将文档转换为在线文档，供浏览
 */
export async function convertDocuments(
  projectPath: string,
  projectId: string
): Promise<ConvertedDoc[]> {
  const converted: ConvertedDoc[] = [];
  const docsDir = path.join(process.env.PROJECT_DATA_DIR || '/tmp/teamclaw/projects', projectId, 'docs');
  
  // Supported document types
  const docPatterns = [
    { ext: '.md', format: 'markdown' },
    { ext: '.txt', format: 'text' },
    { ext: '.json', format: 'json' },
    { ext: '.yaml', format: 'yaml' },
    { ext: '.yml', format: 'yaml' },
  ];

  for (const { ext, format } of docPatterns) {
    const files = findFilesByExt(projectPath, ext, 4);
    for (const file of files) {
      // Skip node_modules, .git
      if (file.includes('node_modules') || file.includes('.git')) continue;
      
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const relPath = path.relative(projectPath, file);
        const html = markdownToHtml(content, relPath);
        
        const outputFileName = relPath.replace(/[.#\/\\]/g, '_') + '.html';
        const outputPath = path.join(docsDir, outputFileName);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, html);

        converted.push({
          originalPath: relPath,
          convertedPath: outputFileName,
          format,
          title: extractTitle(content, relPath),
          size: fs.statSync(outputPath).size,
        });
      } catch {
        // skip files we can't read
      }
    }
  }

  return converted;
}

function findFilesByExt(dir: string, ext: string, maxDepth: number, currentDepth = 0, results: string[] = []): string[] {
  if (currentDepth > maxDepth) return results;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      if (entry.isDirectory()) {
        findFilesByExt(fullPath, ext, maxDepth, currentDepth + 1, results);
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        results.push(fullPath);
      }
    }
  } catch {
    // ignore
  }
  return results;
}

function extractTitle(content: string, filePath: string): string {
  // Try to extract title from first line
  const firstLine = content.split('\n')[0]?.trim();
  if (firstLine && firstLine.startsWith('#')) {
    return firstLine.replace(/^#+\s*/, '').trim();
  }
  return path.basename(filePath);
}

function markdownToHtml(markdown: string, filePath: string): string {
  let html = markdown
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Paragraphs
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p && !p.startsWith('<'))
    .map(p => `<p>${p}</p>`)
    .join('\n');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>(\n|$))+/g, match => `<ul>${match}</ul>`);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${extractTitle(markdown, filePath)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
  h1 { border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { border-bottom: 1px solid #ddd; padding-bottom: 6px; }
  pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
  code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  pre code { background: none; padding: 0; }
  a { color: #0066cc; }
  ul { padding-left: 24px; }
  li { margin: 4px 0; }
</style>
</head>
<body>
${html}
<footer style="margin-top:40px;padding-top:20px;border-top:1px solid #ddd;color:#888;font-size:12px;">
文档来源: ${filePath}
</footer>
</body>
</html>`;
}

export async function getConvertedDocs(projectId: string): Promise<ConvertedDoc[]> {
  const docsDir = path.join(process.env.PROJECT_DATA_DIR || '/tmp/teamclaw/projects', projectId, 'docs');
  if (!fs.existsSync(docsDir)) return [];
  
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.html'));
  const result: ConvertedDoc[] = [];
  
  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const stats = fs.statSync(filePath);
    // Extract original path from filename
    const originalPath = file.replace(/\.html$/, '').replace(/_/g, '/');
    result.push({
      originalPath,
      convertedPath: file,
      format: 'html',
      title: originalPath.split('/').pop() || originalPath,
      size: stats.size,
    });
  }
  
  return result;
}

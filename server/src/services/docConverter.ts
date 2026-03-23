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
  const docsDir = path.join(
    process.env.PROJECT_DATA_DIR || '/tmp/teamclaw/projects',
    projectId,
    'docs'
  );

  // Supported document types
  const docPatterns = [
    { ext: '.md', format: 'markdown' },
    { ext: '.txt', format: 'text' },
    { ext: '.json', format: 'json' },
    { ext: '.yaml', format: 'yaml' },
    { ext: '.yml', format: 'yaml' },
    { ext: '.docx', format: 'docx' },
    { ext: '.pptx', format: 'pptx' },
    { ext: '.pdf', format: 'pdf' },
  ];

  for (const { ext, format } of docPatterns) {
    const files = findFilesByExt(projectPath, ext, 4);
    for (const file of files) {
      // Skip node_modules, .git
      if (file.includes('node_modules') || file.includes('.git')) continue;

      try {
        const relPath = path.relative(projectPath, file);
        const outputFileName = relPath.replace(/[.#\/\\]/g, '_') + '.html';
        const outputPath = path.join(docsDir, outputFileName);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });

        let html: string;
        let title = '';

        if (format === 'docx') {
          html = await docxToHTML(file);
          title = extractTitleFromPath(relPath);
        } else if (format === 'pptx') {
          html = await pptxToHTML(file);
          title = extractTitleFromPath(relPath);
        } else if (format === 'pdf') {
          html = await pdfToHTML(file);
          title = extractTitleFromPath(relPath);
        } else {
          // Text-based formats
          const content = fs.readFileSync(file, 'utf-8');
          title = extractTitle(content, relPath);
          html =
            format === 'markdown'
              ? markdownToHtml(content, relPath)
              : plainTextToHtml(content, relPath);
        }

        fs.writeFileSync(outputPath, html);

        converted.push({
          originalPath: relPath,
          convertedPath: outputFileName,
          format,
          title,
          size: fs.statSync(outputPath).size,
        });
      } catch (err) {
        // skip files we can't convert
        console.warn(
          `[docConverter] Failed to convert ${file}:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  }

  return converted;
}

function findFilesByExt(
  dir: string,
  ext: string,
  maxDepth: number,
  currentDepth = 0,
  results: string[] = []
): string[] {
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

function extractTitleFromPath(filePath: string): string {
  return path.basename(filePath).replace(/\.[^.]+$/, '');
}

function plainTextToHtml(content: string, filePath: string): string {
  const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${path.basename(filePath)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
  pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
</style>
</head>
<body>
<pre>${escaped}</pre>
</body>
</html>`;
}

/**
 * Convert DOCX to HTML using mammoth
 */
async function docxToHTML(filePath: string): Promise<string> {
  try {
    // Dynamic import to avoid hard dependency
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${path.basename(filePath)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.8; color: #333; }
  h1 { border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { border-bottom: 1px solid #ddd; padding-bottom: 6px; }
  pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
</style>
</head>
<body>
${escaped
  .split('\n')
  .map(line => (line.trim() ? `<p>${line}</p>` : ''))
  .join('\n')}
</body>
</html>`;
  } catch (err) {
    console.warn(
      `[docConverter] docxToHTML failed for ${filePath}:`,
      err instanceof Error ? err.message : String(err)
    );
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${path.basename(filePath)}</title></head>
<body><p>无法转换此 DOCX 文件: ${filePath}</p></body></html>`;
  }
}

/**
 * Convert PPTX to HTML (extracts slide text)
 */
async function pptxToHTML(filePath: string): Promise<string> {
  try {
    // Use a simple unzip + XML parse approach for PPTX
    const slides = await extractPptxText(filePath);
    const slideHtmls = slides
      .map(
        (slideText, i) => `
      <div class="slide" id="slide-${i + 1}">
        <h2 class="slide-title">幻灯片 ${i + 1}</h2>
        <div class="slide-content">${slideText
          .split('\n')
          .map(line => (line.trim() ? `<p>${line}</p>` : ''))
          .join('\n')}</div>
      </div>
    `
      )
      .join('\n');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${path.basename(filePath)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
  .slide { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 24px; padding: 20px; background: #fff; }
  .slide-title { color: #0066cc; margin-top: 0; }
  .slide-content p { margin: 4px 0; }
  .slide-content ul { padding-left: 24px; }
</style>
</head>
<body>
${slideHtmls}
</body>
</html>`;
  } catch (err) {
    console.warn(
      `[docConverter] pptxToHTML failed for ${filePath}:`,
      err instanceof Error ? err.message : String(err)
    );
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${path.basename(filePath)}</title></head>
<body><p>无法转换此 PPTX 文件: ${filePath}</p></body></html>`;
  }
}

/**
 * Extract text from PPTX by unzipping and parsing slide XMLs
 */
async function extractPptxText(filePath: string): Promise<string[]> {
  const slides: string[] = [];
  const { execSync } = await import('child_process');

  // Unzip to temp dir
  const tmpDir = path.join('/tmp', `pptx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    execSync(`unzip -o "${filePath}" -d "${tmpDir}"`, { stdio: 'pipe' });

    // Find all slide XMLs
    const pptDir = path.join(tmpDir, 'ppt');
    if (!fs.existsSync(pptDir)) return [`无法解析 PPTX 结构: ${filePath}`];

    const slidesDir = path.join(pptDir, 'slides');
    if (!fs.existsSync(slidesDir)) return [`无法找到幻灯片: ${filePath}`];

    const slideFiles = fs
      .readdirSync(slidesDir)
      .filter(f => f.startsWith('slide') && f.endsWith('.xml'))
      .sort((a, b) => {
        const na = parseInt(a.replace('slide', '').replace('.xml', ''));
        const nb = parseInt(b.replace('slide', '').replace('.xml', ''));
        return na - nb;
      });

    for (const slideFile of slideFiles) {
      const slideXml = fs.readFileSync(path.join(slidesDir, slideFile), 'utf-8');
      // Extract all [t] tags (slide text)
      const texts: string[] = [];
      const matches = slideXml.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g);
      for (const m of matches) {
        const t = m[1].trim();
        if (t) texts.push(t);
      }
      slides.push(texts.join(' | '));
    }
  } finally {
    // Cleanup temp dir
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  }

  return slides.length > 0 ? slides : [`幻灯片无文本内容: ${filePath}`];
}

/**
 * Convert PDF to HTML (extracts text pages)
 */
async function pdfToHTML(filePath: string): Promise<string> {
  try {
    // Dynamic import to avoid hard dependency
    const pdfParse = await import('pdf-parse');
    const data = fs.readFileSync(filePath);
    const parsed = await pdfParse.default(data);

    const pages = parsed.pages
      .map(
        (page: { text: string }, i: number) => `
      <div class="page" id="page-${i + 1}">
        <h3 class="page-title">第 ${i + 1} 页</h3>
        <div class="page-content">${(page.text || '')
          .split('\n')
          .map(line => (line.trim() ? `<p>${line}</p>` : ''))
          .join('\n')}</div>
      </div>
    `
      )
      .join('\n');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${path.basename(filePath)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.8; color: #333; }
  .page { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 24px; padding: 20px; background: #fff; }
  .page-title { color: #0066cc; margin-top: 0; font-size: 14px; }
  pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
  a { color: #0066cc; }
</style>
</head>
<body>
${pages}
</body>
</html>`;
  } catch (err) {
    console.warn(
      `[docConverter] pdfToHTML failed for ${filePath}:`,
      err instanceof Error ? err.message : String(err)
    );
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${path.basename(filePath)}</title></head>
<body><p>无法转换此 PDF 文件: ${filePath}</p></body></html>`;
  }
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
  const docsDir = path.join(
    process.env.PROJECT_DATA_DIR || '/tmp/teamclaw/projects',
    projectId,
    'docs'
  );
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

// Language detection from file extension for syntax highlighting
const LANG_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.php': 'php',
  '.pl': 'perl',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.fish': 'bash',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.md': 'markdown',
  '.rst': 'rst',
  '.dockerfile': 'dockerfile',
  '.tf': 'hcl',
  '.hcl': 'hcl',
  '.toml': 'toml',
  '.ini': 'ini',
  '.conf': 'ini',
  '.diff': 'diff',
  '.patch': 'diff',
  '.gitignore': 'gitignore',
  '.env': 'bash',
  '.csv': 'csv',
  '.log': 'log',
};

/**
 * Convert a source code file to syntax-highlighted HTML
 */
export function codeToHtml(filePath: string, content: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const lang = LANG_MAP[ext] || 'plaintext';
  const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Simple keyword highlighting for common languages
  const highlighted = applyBasicHighlight(escaped, lang);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${path.basename(filePath)}</title>
<style>
  body { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace; background: #1e1e1e; color: #d4d4d4; margin: 0; padding: 20px; }
  .line { display: flex; line-height: 1.6; font-size: 13px; }
  .line-num { color: #858585; min-width: 50px; padding-right: 16px; text-align: right; user-select: none; }
  .line-content { white-space: pre; flex: 1; overflow-x: auto; }
  .keyword { color: #569cd6; font-weight: bold; }
  .string { color: #ce9178; }
  .number { color: #b5cea8; }
  .comment { color: #6a9955; font-style: italic; }
  .function { color: #dcdcaa; }
  .type { color: #4ec9b0; }
  .operator { color: #d4d4d4; }
  pre { margin: 0; }
  .line:hover { background: #2a2d2e; }
</style>
</head>
<body>
<pre>${highlighted}</pre>
</body>
</html>`;
}

// Basic syntax highlighting without external deps
function applyBasicHighlight(code: string, lang: string): string {
  // Wrap each line
  const lines = code.split('\n');
  return lines
    .map((line, i) => {
      const num = `<span class="line-num">${i + 1}</span>`;
      const highlighted = highlightLine(line, lang);
      return `<div class="line">${num}<span class="line-content">${highlighted}</span></div>`;
    })
    .join('\n');
}

const KEYWORDS: Record<string, string[]> = {
  typescript: [
    'const',
    'let',
    'var',
    'function',
    'class',
    'interface',
    'type',
    'enum',
    'import',
    'export',
    'from',
    'return',
    'if',
    'else',
    'for',
    'while',
    'do',
    'switch',
    'case',
    'break',
    'continue',
    'try',
    'catch',
    'finally',
    'throw',
    'new',
    'this',
    'super',
    'extends',
    'implements',
    'public',
    'private',
    'protected',
    'readonly',
    'async',
    'await',
    'yield',
    'static',
    'get',
    'set',
    'of',
    'in',
    'typeof',
    'instanceof',
    'void',
    'null',
    'undefined',
    'true',
    'false',
    'any',
    'never',
    'unknown',
    'as',
    'keyof',
    'infer',
  ],
  javascript: [
    'const',
    'let',
    'var',
    'function',
    'class',
    'import',
    'export',
    'from',
    'return',
    'if',
    'else',
    'for',
    'while',
    'do',
    'switch',
    'case',
    'break',
    'continue',
    'try',
    'catch',
    'finally',
    'throw',
    'new',
    'this',
    'super',
    'extends',
    'async',
    'await',
    'yield',
    'static',
    'get',
    'set',
    'of',
    'in',
    'typeof',
    'instanceof',
    'void',
    'null',
    'undefined',
    'true',
    'false',
    'default',
    'delete',
  ],
  python: [
    'def',
    'class',
    'import',
    'from',
    'as',
    'return',
    'if',
    'elif',
    'else',
    'for',
    'while',
    'try',
    'except',
    'finally',
    'with',
    'raise',
    'pass',
    'break',
    'continue',
    'and',
    'or',
    'not',
    'in',
    'is',
    'None',
    'True',
    'False',
    'lambda',
    'yield',
    'global',
    'nonlocal',
    'assert',
    'del',
    'async',
    'await',
  ],
  sql: [
    'SELECT',
    'FROM',
    'WHERE',
    'INSERT',
    'UPDATE',
    'DELETE',
    'CREATE',
    'DROP',
    'ALTER',
    'TABLE',
    'INDEX',
    'JOIN',
    'LEFT',
    'RIGHT',
    'INNER',
    'OUTER',
    'ON',
    'AND',
    'OR',
    'NOT',
    'IN',
    'IS',
    'NULL',
    'AS',
    'ORDER',
    'BY',
    'GROUP',
    'HAVING',
    'LIMIT',
    'OFFSET',
    'UNION',
    'ALL',
    'DISTINCT',
    'COUNT',
    'SUM',
    'AVG',
    'MAX',
    'MIN',
    'CASE',
    'WHEN',
    'THEN',
    'ELSE',
    'END',
    'PRIMARY',
    'KEY',
    'FOREIGN',
    'REFERENCES',
    'CONSTRAINT',
  ],
  bash: [
    'if',
    'then',
    'else',
    'elif',
    'fi',
    'for',
    'while',
    'do',
    'done',
    'case',
    'esac',
    'in',
    'function',
    'return',
    'exit',
    'echo',
    'read',
    'export',
    'local',
    'readonly',
    'unset',
    'shift',
    'set',
    'source',
    'alias',
    'cd',
    'pwd',
    'ls',
    'mkdir',
    'rm',
    'cp',
    'mv',
    'cat',
    'grep',
    'sed',
    'awk',
    'find',
    'xargs',
    'sort',
    'uniq',
    'wc',
    'head',
    'tail',
    'cut',
    'tr',
    'test',
    'true',
    'false',
  ],
};

function highlightLine(line: string, lang: string): string {
  // Simple tokenizer-based highlighting
  const keywords = KEYWORDS[lang] || KEYWORDS['javascript'];

  // Escape HTML first (already done by caller)
  let result = line;

  // Highlight strings (double and single quoted)
  result = result.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="string">$&</span>');

  // Highlight comments
  if (lang === 'python') {
    result = result.replace(/(#.*)$/gm, '<span class="comment">$1</span>');
  } else if (lang === 'sql') {
    result = result.replace(/(--[^\n]*)/g, '<span class="comment">$1</span>');
  } else {
    result = result.replace(/(\/\/[^\n]*)/g, '<span class="comment">$1</span>');
    result = result.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
  }

  // Highlight numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

  // Highlight keywords (careful not to highlight inside strings)
  for (const kw of keywords) {
    const boundary = lang === 'python' ? `\\b${kw}\\b` : `\\b${kw}\\b`;
    try {
      result = result.replace(new RegExp(boundary, 'g'), `<span class="keyword">${kw}</span>`);
    } catch {
      // Skip invalid regex
    }
  }

  return result;
}

/**
 * Get preview of any supported file type as HTML
 */
export function getFilePreview(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;

  const ext = path.extname(filePath).toLowerCase();
  const supportedCodeExts = Object.keys(LANG_MAP);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    if (supportedCodeExts.includes(ext)) {
      return codeToHtml(filePath, content);
    }

    if (ext === '.md') {
      return markdownToHtml(content, filePath);
    }

    if (ext === '.txt') {
      const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${path.basename(filePath)}</title><style>
        body { font-family: monospace; background: #fafafa; margin: 20px; }
        pre { white-space: pre-wrap; word-wrap: break-word; }
      </style></head><body><pre>${escaped}</pre></body></html>`;
    }

    if (['.json', '.yaml', '.yml', '.xml'].includes(ext)) {
      const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${path.basename(filePath)}</title><style>
        body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; margin: 20px; padding: 20px; }
        pre { white-space: pre-wrap; word-wrap: break-word; }
      </style></head><body><pre>${escaped}</pre></body></html>`;
    }

    return null; // Unsupported type for preview
  } catch {
    return null;
  }
}

/**
 * docParser.ts — 文档解析服务
 * 支持 PPT/Word/Excel/Markdown/Text → 纯文本提取
 */
import * as fs from 'fs';
import * as path from 'path';
// 支持的文档扩展名
const MARKDOWN_EXTS = ['.md', '.markdown', '.mdown', '.mkd'];
const TEXT_EXTS = ['.txt', '.text', '.log', '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf'];
const CODE_EXTS = [
    '.ts', '.tsx', '.js', '.jsx', '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
    '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.html', '.css', '.scss', '.less',
    '.sql', '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
];
export async function parseDocument(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
    if (!stat || !stat.isFile())
        return null;
    // 跳过太大文件（>5MB）
    if (stat.size > 5 * 1024 * 1024)
        return null;
    try {
        if (MARKDOWN_EXTS.includes(ext)) {
            return parseMarkdown(filePath, stat);
        }
        else if (TEXT_EXTS.includes(ext) || CODE_EXTS.includes(ext)) {
            return parseText(filePath, stat);
        }
        // PPT/Word/Excel 暂不支持纯 Node.js 解析（需要额外库）
        // 记录为 unsupported，保留文件路径供后续处理
        return null;
    }
    catch {
        return null;
    }
}
function parseMarkdown(filePath, stat) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
        path: filePath,
        content,
        type: 'markdown',
        size: stat.size,
    };
}
function parseText(filePath, stat) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
        path: filePath,
        content,
        type: 'text',
        size: stat.size,
    };
}
export async function parseDirectory(dirPath) {
    const results = [];
    const allFiles = getAllFiles(dirPath);
    for (const file of allFiles) {
        const parsed = await parseDocument(file);
        if (parsed) {
            results.push(parsed);
        }
    }
    return results;
}
function getAllFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        // 跳过 node_modules, .git, dist, build 等目录
        if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.venv', 'vendor'].includes(entry.name)) {
                getAllFiles(full, files);
            }
        }
        else {
            files.push(full);
        }
    }
    return files;
}
export function extractKeyPhrases(text, maxPhrases = 20) {
    // 简单关键词提取：出现频率高的单词
    const words = text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4);
    const freq = {};
    for (const w of words) {
        freq[w] = (freq[w] || 0) + 1;
    }
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxPhrases)
        .map(([word]) => word);
}

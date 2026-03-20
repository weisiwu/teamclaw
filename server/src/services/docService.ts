import * as fs from 'fs';
import * as path from 'path';
import * as pathModule from 'path';

export interface DocItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  path: string;
}

// 文档存储根目录
function getDocsRootDir(): string {
  const dir = path.join(process.env.DOCS_DIR || '/tmp/teamclaw/docs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// 获取文档列表
function getDocList(search?: string): DocItem[] {
  const docsDir = getDocsRootDir();
  const docs: DocItem[] = [];

  if (!fs.existsSync(docsDir)) {
    return docs;
  }

  const files = fs.readdirSync(docsDir, { withFileTypes: true });
  for (const file of files) {
    if (file.isFile()) {
      const ext = pathModule.extname(file.name).toLowerCase();
      const stats = fs.statSync(path.join(docsDir, file.name));
      const uploadedAt = stats.mtime.toISOString();

      if (search && !file.name.toLowerCase().includes(search.toLowerCase())) {
        continue;
      }

      docs.push({
        id: Buffer.from(file.name).toString('base64').replace(/[/+=]/g, '_').slice(0, 16),
        name: file.name,
        type: ext.replace('.', ''),
        size: stats.size,
        uploadedAt,
        path: path.join(docsDir, file.name),
      });
    }
  }

  return docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

// 获取文档详情
export function getDoc(docId: string): DocItem | null {
  const docs = getDocList();
  const doc = docs.find(d => d.id === docId);
  if (!doc) return null;

  // 验证文件仍然存在
  if (!fs.existsSync(doc.path)) return null;
  return doc;
}

// 获取文档内容（用于在线浏览）
function getDocContent(docId: string): { content: string; format: string } | null {
  const doc = getDoc(docId);
  if (!doc) return null;

  const ext = doc.type.toLowerCase();
  const content = fs.readFileSync(doc.path, 'utf-8');

  // 支持的在线格式
  const onlineFormats = ['md', 'txt', 'json', 'xml', 'html', 'css', 'js', 'ts'];
  if (onlineFormats.includes(ext)) {
    return { content, format: ext };
  }

  // 不支持的格式返回提示
  return { content: `[${ext.toUpperCase()} 文件] 不支持在线预览，请下载后查看`, format: 'text' };
}

// 下载文档（返回文件路径）
function getDocFilePath(docId: string): string | null {
  const doc = getDoc(docId);
  if (!doc) return null;
  if (!fs.existsSync(doc.path)) return null;
  return doc.path;
}

// 上传文档
function uploadDoc(filename: string, buffer: Buffer): DocItem {
  const docsDir = getDocsRootDir();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(docsDir, safeName);
  fs.writeFileSync(filePath, buffer);
  const stats = fs.statSync(filePath);
  const uploadedAt = stats.mtime.toISOString();

  const id = Buffer.from(safeName).toString('base64').replace(/[/+=]/g, '_').slice(0, 16);
  return {
    id,
    name: safeName,
    type: pathModule.extname(safeName).replace('.', ''),
    size: stats.size,
    uploadedAt,
    path: filePath,
  };
}

// 删除文档
function deleteDoc(docId: string): boolean {
  const doc = getDoc(docId);
  if (!doc) return false;
  try {
    if (fs.existsSync(doc.path)) {
      fs.unlinkSync(doc.path);
    }
    return true;
  } catch {
    return false;
  }
}

export const docService = {
  getDocsRootDir,
  getDocList,
  getDoc,
  getDocContent,
  getDocFilePath,
  uploadDoc,
  deleteDoc,
};

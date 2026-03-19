import * as path from 'path';
import { docService, DocItem } from './docService.js';

// 支持的文档类型
const SUPPORTED_TYPES = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'md', 'json', 'xml', 'csv', 'png', 'jpg', 'jpeg', 'gif', 'zip',
]);

// 文档自动归档入口（群聊文件消息触发）
async function archiveFile(
  filename: string,
  buffer: Buffer,
  source: 'feishu' | 'wechat' | 'web' = 'web'
): Promise<DocItem> {
  // 验证文件类型
  const ext = path.extname(filename).replace('.', '').toLowerCase();
  if (!SUPPORTED_TYPES.has(ext)) {
    throw new Error(`不支持的文件类型: .${ext}`);
  }

  // 添加来源前缀便于追溯
  const prefixedName = `[${source}]_${filename}`;
  const doc = docService.uploadDoc(prefixedName, buffer);

  console.log(`[docArchiver] Archived file: ${filename} from ${source}, id: ${doc.id}`);
  return doc;
}

// 获取归档记录（带来源过滤）
function getArchivedList(source?: string): DocItem[] {
  const docs = docService.getDocList();
  if (!source) return docs;
  return docs.filter(d => d.name.startsWith(`[${source}]`));
}

export const docArchiver = {
  archiveFile,
  getArchivedList,
  SUPPORTED_TYPES,
};

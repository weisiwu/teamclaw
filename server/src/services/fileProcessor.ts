/**
 * File Processor Service
 * 消息机制模块 - 文件消息处理
 *
 * 负责：
 * - 识别文件类型
 * - 下载并存储文件
 * - 提取文本内容
 * - 自动归档到文档库
 */

import { parseDocument } from './docParser.js';
import { docService } from './docService.js';
import { addDocuments } from './vectorStore.js';
import * as fs from 'fs';
import * as path from 'path';

export type SupportedDocType =
  | 'pdf'
  | 'word'
  | 'excel'
  | 'ppt'
  | 'image'
  | 'markdown'
  | 'text'
  | 'unknown';

export interface ArchiveResult {
  success: boolean;
  docId?: string;
  localPath?: string;
  extractedText?: string;
  error?: string;
}

const DOC_EXTENSIONS: Record<string, SupportedDocType> = {
  '.pdf': 'pdf',
  '.doc': 'word',
  '.docx': 'word',
  '.xls': 'excel',
  '.xlsx': 'excel',
  '.ppt': 'ppt',
  '.pptx': 'ppt',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.gif': 'image',
  '.webp': 'image',
  '.md': 'markdown',
  '.txt': 'text',
};

const PARSEABLE_MIMES = new Set([
  'text/markdown',
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

/**
 * 识别文件类型
 */
export function detectType(filename: string): SupportedDocType {
  const ext = path.extname(filename).toLowerCase();
  return DOC_EXTENSIONS[ext] || 'unknown';
}

/**
 * 检查是否为可解析类型
 */
export function isParseable(filename: string, mimeType?: string): boolean {
  if (mimeType && PARSEABLE_MIMES.has(mimeType)) return true;
  const ext = path.extname(filename).toLowerCase();
  return ['.pdf', '.docx', '.xlsx', '.pptx', '.md', '.txt'].includes(ext);
}

/**
 * 下载并存储文件
 * @param url 文件 URL（飞书/微信/外部）
 * @param projectName 项目名称（用于目录结构）
 * @returns 本地存储路径
 */
export async function download(url: string, projectName: string): Promise<string> {
  const timestamp = Date.now();
  const filename = `doc_${timestamp}_${projectName}`;
  const dir = path.join(process.cwd(), 'data', 'documents', projectName);

  // Ensure directory exists
  await fs.promises.mkdir(dir, { recursive: true });

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const filePath = path.join(dir, filename);

    await fs.promises.writeFile(filePath, Buffer.from(buffer));
    console.log(`[fileProcessor] Downloaded file to: ${filePath}`);

    return filePath;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`download failed: ${msg}`);
  }
}

/**
 * 提取文本内容（调用 docParser）
 */
export async function extractText(filePath: string): Promise<string> {
  try {
    const parsed = await parseDocument(filePath);
    return parsed?.content || '';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[fileProcessor] extractText failed for ${filePath}: ${msg}`);
    return '';
  }
}

/**
 * 自动归档文件到文档库
 * @param filePath 本地文件路径
 * @param projectName 项目名称
 * @param metadata 额外元数据
 */
export async function archive(
  filePath: string,
  projectName: string,
  metadata?: {
    messageId?: string;
    channel?: string;
    userId?: string;
    userName?: string;
    originalFilename?: string;
  }
): Promise<ArchiveResult> {
  const filename = path.basename(filePath);

  try {
    // 读取文件内容
    const content = await fs.promises.readFile(filePath);
    const buffer = content;

    // 写入文档库
    const doc = docService.uploadDoc(filename, buffer);
    console.log(`[fileProcessor] Archived to doc library: ${doc.id}`);

    // 提取文本并向量化
    if (isParseable(filename)) {
      const text = await extractText(filePath);
      if (text) {
        await addDocuments(
          'documents',
          [text],
          [`doc_${doc.id}`],
          [
            {
              docId: doc.id,
              fileName: filename,
              messageId: metadata?.messageId,
              channel: metadata?.channel,
              uploadedAt: new Date().toISOString(),
              type: 'document_content',
              projectName,
            },
          ]
        );
        console.log(`[fileProcessor] Document content vectorized: ${filename}`);
      }
    }

    return {
      success: true,
      docId: doc.id,
      localPath: filePath,
      extractedText: '',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[fileProcessor] archive failed: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * 处理文件消息的完整流程
 */
export async function processFileMessage(params: {
  url?: string;
  localPath?: string;
  filename: string;
  mimeType?: string;
  projectName: string;
  metadata?: {
    messageId?: string;
    channel?: string;
    userId?: string;
    userName?: string;
  };
}): Promise<ArchiveResult> {
  const {
    url,
    localPath,
    filename: pFilename,
    mimeType: pMimeType,
    projectName,
    metadata,
  } = params;

  // Check if file type is supported
  const supported = isParseable(pFilename, pMimeType);
  if (!supported) {
    console.log(`[fileProcessor] Skipping unsupported file type: ${pFilename}`);
  }

  let filePath = localPath;

  // 如果提供了 URL，先下载
  if (url && !localPath) {
    filePath = await download(url, projectName);
  }

  if (!filePath) {
    return { success: false, error: 'No file path available' };
  }

  // 归档到文档库
  const result = await archive(filePath, projectName, metadata);

  // 如果是临时下载的文件，清理之
  if (url && filePath && filePath.startsWith('/tmp/')) {
    fs.promises.unlink(filePath).catch(() => {});
  }

  return result;
}

/**
 * File Processor 单例
 */
export const fileProcessor = {
  detectType,
  isParseable,
  download,
  extractText,
  archive,
  processFileMessage,
};

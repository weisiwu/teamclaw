/**
 * Context Compressor — 长文档分块服务
 * Step 6 of 11-step import: 将长文档按语义边界分块
 */

import fs from 'fs';
import path from 'path';

export interface TextChunk {
  id: string;
  content: string;
  source: string; // 来源文件路径
  startLine: number;
  endLine: number;
  tokenCount: number;
}

export class ContextCompressor {
  private maxChunkTokens: number;
  private overlapTokens: number;

  constructor(maxChunkTokens = 512, overlapTokens = 50) {
    this.maxChunkTokens = maxChunkTokens;
    this.overlapTokens = overlapTokens;
  }

  /**
   * 估算 token 数量（中文约 1.5 chars/token，英文约 4 chars/token）
   */
  estimateTokens(text: string): number {
    const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const english = text.length - chinese;
    return Math.ceil(chinese / 1.5 + english / 4);
  }

  /**
   * 将长文本按语义边界分块
   * 优先按 Markdown 标题/段落分割，其次按 token 数量分割
   */
  chunk(text: string, source: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const lines = text.split('\n');

    // 1. 按 Markdown 标题分割成段落组
    const sections = this.splitByHeaders(lines);

    let globalOffset = 0;
    let chunkIndex = 0;

    for (const section of sections) {
      const sectionText = section.lines.join('\n');
      const sectionTokens = this.estimateTokens(sectionText);
      const sectionStartLine = globalOffset + 1;
      const sectionEndLine = globalOffset + section.lines.length;

      // 如果单个 section 就超过限制，继续按段落/句子分割
      if (sectionTokens > this.maxChunkTokens) {
        const subChunks = this.splitByTokenLimit(section.lines, source, sectionStartLine);
        for (const sub of subChunks) {
          chunks.push(sub);
          chunkIndex++;
        }
      } else {
        // 重叠上下文：向前取 overlapTokens 的 token
        const overlapContent = this.getOverlapContent(lines, globalOffset);
        const contentWithOverlap = overlapContent
          ? `${overlapContent}\n${sectionText}`
          : sectionText;

        chunks.push({
          id: `chunk_${this.sanitizeId(source)}_${chunkIndex}`,
          content: contentWithOverlap,
          source,
          startLine: sectionStartLine,
          endLine: sectionEndLine,
          tokenCount: this.estimateTokens(contentWithOverlap),
        });
        chunkIndex++;
      }

      globalOffset += section.lines.length;
    }

    return chunks;
  }

  /**
   * 按 Markdown 标题将文本分割成多个 section
   */
  private splitByHeaders(lines: string[]): Array<{ lines: string[]; level: number }> {
    const sections: Array<{ lines: string[]; level: number }> = [];
    let currentSection: string[] = [];
    let currentLevel = 0;

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        // 保存当前段落
        if (currentSection.length > 0) {
          sections.push({ lines: [...currentSection], level: currentLevel });
        }
        // 开始新段落
        currentSection = [line];
        currentLevel = level;
      } else {
        currentSection.push(line);
      }
    }

    // 保存最后一段
    if (currentSection.length > 0) {
      sections.push({ lines: currentSection, level: currentLevel });
    }

    return sections;
  }

  /**
   * 当段落超过 token 限制时，按句子/行进一步分割
   */
  private splitByTokenLimit(lines: string[], source: string, startLine: number): TextChunk[] {
    const chunks: TextChunk[] = [];
    let currentChunkLines: string[] = [];
    let currentChunkTokens = 0;
    let chunkIndex = 0;
    let lineOffset = startLine;

    for (const line of lines) {
      const lineTokens = this.estimateTokens(line);

      // 如果单行就超过限制，按固定字符数截断
      if (lineTokens > this.maxChunkTokens) {
        if (currentChunkLines.length > 0) {
          chunks.push(this.makeChunk(currentChunkLines, source, lineOffset, chunkIndex));
          chunkIndex++;
          currentChunkLines = [];
          currentChunkTokens = 0;
        }
        const truncatedLines = this.truncateLine(line, this.maxChunkTokens);
        chunks.push(this.makeChunk(truncatedLines, source, lineOffset, chunkIndex));
        chunkIndex++;
        lineOffset++;
        continue;
      }

      if (currentChunkTokens + lineTokens > this.maxChunkTokens) {
        // 保存当前 chunk
        chunks.push(this.makeChunk(currentChunkLines, source, lineOffset, chunkIndex));
        chunkIndex++;

        // 重叠：取最后 overlapTokens 的行
        const overlapLines = this.takeOverlapLines(currentChunkLines);
        lineOffset = lineOffset - overlapLines.length + currentChunkLines.length;
        currentChunkLines = [...overlapLines, line];
        currentChunkTokens = this.estimateTokens(currentChunkLines.join('\n'));
      } else {
        currentChunkLines.push(line);
        currentChunkTokens += lineTokens;
      }
    }

    // 保存最后一块
    if (currentChunkLines.length > 0) {
      chunks.push(this.makeChunk(currentChunkLines, source, lineOffset, chunkIndex));
    }

    return chunks;
  }

  private makeChunk(lines: string[], source: string, startLine: number, index: number): TextChunk {
    return {
      id: `chunk_${this.sanitizeId(source)}_${index}`,
      content: lines.join('\n'),
      source,
      startLine,
      endLine: startLine + lines.length - 1,
      tokenCount: this.estimateTokens(lines.join('\n')),
    };
  }

  /**
   * 获取向前重叠的上下文（overlapTokens token）
   */
  private getOverlapContent(lines: string[], currentOffset: number): string {
    if (currentOffset === 0 || this.overlapTokens <= 0) return '';

    const prevLines = lines.slice(0, currentOffset);
    const overlapLines: string[] = [];
    let tokens = 0;

    // 从后向前取 overlapTokens
    for (let i = prevLines.length - 1; i >= 0 && tokens < this.overlapTokens; i--) {
      const lineTokens = this.estimateTokens(prevLines[i]);
      overlapLines.unshift(prevLines[i]);
      tokens += lineTokens;
    }

    return overlapLines.join('\n');
  }

  /**
   * 取最后 overlapTokens 的行
   */
  private takeOverlapLines(lines: string[]): string[] {
    const overlapLines: string[] = [];
    let tokens = 0;

    for (let i = lines.length - 1; i >= 0 && tokens < this.overlapTokens; i--) {
      const lineTokens = this.estimateTokens(lines[i]);
      overlapLines.unshift(lines[i]);
      tokens += lineTokens;
    }

    return overlapLines;
  }

  /**
   * 将超长行按字符数截断
   */
  private truncateLine(line: string, maxTokens: number): string[] {
    // 假设每 token 约 4 字符
    const maxChars = maxTokens * 4;
    const chunks: string[] = [];

    for (let i = 0; i < line.length; i += maxChars) {
      chunks.push(line.slice(i, i + maxChars));
    }

    return chunks;
  }

  private sanitizeId(source: string): string {
    return source.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
  }

  /**
   * 批量处理项目中的所有文档文件
   */
  async chunkProject(projectPath: string, files: string[]): Promise<TextChunk[]> {
    const allChunks: TextChunk[] = [];

    for (const file of files) {
      try {
        const fullPath = path.join(projectPath, file);
        if (!fs.existsSync(fullPath)) continue;

        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) continue;

        // 跳过超大文件（> 1MB）
        if (stat.size > 1024 * 1024) continue;

        const content = fs.readFileSync(fullPath, 'utf-8');
        const chunks = this.chunk(content, file);
        allChunks.push(...chunks);
      } catch {
        // 跳过无法读取的文件
      }
    }

    return allChunks;
  }
}

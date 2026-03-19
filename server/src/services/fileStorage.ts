// File storage service for screenshots
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const STORAGE_DIR = process.env.SCREENSHOT_DIR || './public/screenshots';

export interface SaveResult {
  url: string;
  thumbnailUrl: string;
  fileName: string;
}

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
  }
}

export async function saveScreenshot(
  versionId: string,
  imageData: string, // Base64 data:image/xxx;base64,xxxx or URL
  originalName?: string
): Promise<SaveResult> {
  const versionDir = path.join(STORAGE_DIR, versionId);
  await ensureDir(versionDir);

  const id = randomUUID().slice(0, 8);
  const ext = getExtensionFromData(imageData) || '.png';
  const fileName = `ss-${id}${ext}`;
  const filePath = path.join(versionDir, fileName);

  // Handle Base64 image data
  if (imageData.startsWith('data:image')) {
    const base64Match = imageData.match(/^data:image\/\w+;base64,(.+)$/);
    if (base64Match) {
      const buffer = Buffer.from(base64Match[1], 'base64');
      await fs.writeFile(filePath, buffer);
    }
  } else if (imageData.startsWith('http')) {
    // It's a URL - just store the URL as-is for now
    // In production, you would fetch and save the image
    const urlFileName = `ss-${id}.txt`;
    const urlFilePath = path.join(versionDir, urlFileName);
    await fs.writeFile(urlFilePath, imageData);
    return {
      url: imageData,
      thumbnailUrl: imageData,
      fileName,
    };
  } else {
    // Raw base64 without prefix
    const buffer = Buffer.from(imageData, 'base64');
    await fs.writeFile(filePath, buffer);
  }

  // For thumbnail, we just use the same image for now
  // In production, use sharp to resize
  return {
    url: `/screenshots/${versionId}/${fileName}`,
    thumbnailUrl: `/screenshots/${versionId}/${fileName}`,
    fileName,
  };
}

export async function deleteScreenshotFile(
  versionId: string,
  screenshotUrl: string
): Promise<void> {
  // Extract filename from URL
  const fileName = screenshotUrl.split('/').pop() || '';
  if (!fileName) return;

  const filePath = path.join(STORAGE_DIR, versionId, fileName);
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

export async function listScreenshotFiles(versionId: string): Promise<string[]> {
  const versionDir = path.join(STORAGE_DIR, versionId);
  try {
    const files = await fs.readdir(versionDir);
    return files.filter(f => !f.startsWith('.')).map(f => `/screenshots/${versionId}/${f}`);
  } catch {
    return [];
  }
}

function getExtensionFromData(data: string): string | null {
  const match = data.match(/^data:image\/(\w+);base64,/);
  if (match) {
    const ext = match[1];
    return ext === 'jpeg' ? '.jpg' : `.${ext}`;
  }
  return null;
}

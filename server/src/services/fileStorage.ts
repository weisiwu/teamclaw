/**
 * File Storage Service — Save uploaded images to public/screenshots/
 */

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import crypto from 'crypto';

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'screenshots');

async function ensureDir(dir: string) {
  try {
    await mkdirAsync(dir, { recursive: true });
  } catch {
    // Already exists
  }
}

export async function saveScreenshot(
  versionId: string,
  imageData: string
): Promise<{ url: string; filename: string }> {
  await ensureDir(SCREENSHOTS_DIR);

  // imageData can be data:image/png;base64,... or raw base64
  const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
  let buffer: Buffer;
  let ext = 'png';

  if (matches) {
    ext = matches[1].split('/')[1] || 'png';
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    buffer = Buffer.from(imageData, 'base64');
  }

  const filename = `${versionId}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const filePath = path.join(SCREENSHOTS_DIR, filename);

  await writeFileAsync(filePath, buffer);

  return {
    url: `/screenshots/${filename}`,
    filename,
  };
}

export async function deleteScreenshotFile(
  versionId: string,
  screenshotUrl: string
): Promise<void> {
  try {
    // screenshotUrl is like /screenshots/filename.ext
    const filename = path.basename(screenshotUrl);
    const filePath = path.join(SCREENSHOTS_DIR, filename);

    if (fs.existsSync(filePath)) {
      await unlinkAsync(filePath);
    }
  } catch {
    // Ignore errors on delete
  }
}

export async function listScreenshotFiles(versionId: string): Promise<string[]> {
  await ensureDir(SCREENSHOTS_DIR);
  const files = await fs.promises.readdir(SCREENSHOTS_DIR);
  return files
    .filter(f => f.startsWith(versionId))
    .map(f => `/screenshots/${f}`);
}

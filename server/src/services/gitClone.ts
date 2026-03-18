import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

const PROJECTS_DIR = path.join(os.homedir(), '.openclaw', 'projects');

export async function cloneOrCopyProject(
  source: 'url' | 'local',
  url?: string,
  localPath?: string
): Promise<string> {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });

  if (source === 'url' && url) {
    const repoName = url.split('/').pop()?.replace('.git', '') || 'project';
    const destPath = path.join(PROJECTS_DIR, repoName);

    try {
      await execAsync(`git clone ${url} "${destPath}" --depth 1`);
    } catch {
      // 如果已存在，尝试 pull
      await execAsync(`cd "${destPath}" && git pull`);
    }
    return destPath;
  } else if (source === 'local' && localPath) {
    return localPath;
  }
  throw new Error('Invalid source configuration');
}

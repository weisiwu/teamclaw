import fs from 'fs/promises';
import path from 'path';
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.cache', '__pycache__'];
const IGNORE_EXTENSIONS = ['.lock', '.log', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2'];
export async function scanDirectory(rootPath, maxDepth = 10) {
    async function scan(dir, depth) {
        const stats = await fs.stat(dir);
        if (!stats.isDirectory()) {
            return {
                name: path.basename(dir),
                path: dir,
                type: 'file',
                extension: path.extname(dir),
                size: stats.size,
            };
        }
        if (depth > maxDepth) {
            return { name: path.basename(dir), path: dir, type: 'directory', children: [] };
        }
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const children = [];
        for (const entry of entries) {
            if (IGNORE_DIRS.includes(entry.name))
                continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile() && IGNORE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
                continue;
            }
            children.push(await scan(fullPath, depth + 1));
        }
        return {
            name: path.basename(dir),
            path: dir,
            type: 'directory',
            children: children.sort((a, b) => {
                if (a.type !== b.type)
                    return a.type === 'directory' ? -1 : 1;
                return a.name.localeCompare(b.name);
            }),
        };
    }
    return scan(rootPath, 0);
}

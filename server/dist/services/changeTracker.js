import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
const VERSIONS_BASE_DIR = path.join(process.env.HOME || '/root', '.openclaw/versions');
/**
 * Parse git log into structured commit info
 */
export function parseGitLog(gitLogOutput) {
    const commits = [];
    const commitBlocks = gitLogOutput.split(/^={20,}$/m).filter(Boolean);
    for (const block of commitBlocks) {
        const lines = block.trim().split('\n').filter(Boolean);
        if (lines.length < 2)
            continue;
        const hashLine = lines[0] || '';
        const metaLine = lines[1] || '';
        const body = lines.slice(2).join('\n').trim();
        const hashMatch = hashLine.match(/^([a-f0-9]+)/);
        const metaMatch = metaLine.match(/^(.+?)\s{2,}(.+?)\s{2,}(.+)$/);
        const subjectMatch = body.split('\n').find(l => !l.startsWith(' ') && l.length > 0);
        if (hashMatch) {
            commits.push({
                hash: hashMatch[1],
                shortHash: hashMatch[1].substring(0, 7),
                author: metaMatch?.[1]?.trim() ?? 'unknown',
                date: metaMatch?.[2]?.trim() ?? '',
                subject: subjectMatch ?? '',
                body
            });
        }
    }
    return commits;
}
/**
 * Get file changes between commits or for a tag
 */
export function getFileChanges(repoPath, fromRef, toRef = 'HEAD') {
    try {
        const output = execSync(`git diff --numstat ${fromRef}..${toRef}`, { cwd: repoPath, encoding: 'utf-8', timeout: 10000 });
        return output.trim().split('\n').filter(Boolean).map(line => {
            const [additions, deletions, ...pathParts] = line.split('\t');
            const filePath = pathParts.join('\t');
            return {
                path: filePath,
                status: fs.existsSync(path.join(repoPath, filePath)) ? 'modified' : 'deleted',
                additions: parseInt(additions, 10) || 0,
                deletions: parseInt(deletions, 10) || 0
            };
        });
    }
    catch {
        return [];
    }
}
/**
 * Detect commit category from message
 */
function categorizeCommit(commit) {
    const lower = commit.subject.toLowerCase();
    if (lower.includes('fix') || lower.includes('bug') || lower.includes('patch'))
        return 'fix';
    if (lower.includes('feat') || lower.includes('add') || lower.includes('new:'))
        return 'feature';
    if (lower.includes('improv') || lower.includes('optim') || lower.includes('refactor'))
        return 'improvement';
    return 'technical';
}
/**
 * Generate version changelog markdown
 */
export function generateChangelogMarkdown(versionTag, commits, fileChanges, relatedTasks = []) {
    const categorized = {
        features: commits.filter(c => categorizeCommit(c) === 'feature'),
        fixes: commits.filter(c => categorizeCommit(c) === 'fix'),
        improvements: commits.filter(c => categorizeCommit(c) === 'improvement'),
        technical: commits.filter(c => categorizeCommit(c) === 'technical')
    };
    const totalAdditions = fileChanges.reduce((s, f) => s + f.additions, 0);
    const totalDeletions = fileChanges.reduce((s, f) => s + f.deletions, 0);
    let md = `# ${versionTag} 变更摘要\n\n`;
    md += `> 生成时间：${new Date().toISOString()} | ${commits.length} 个提交 | +${totalAdditions} -${totalDeletions}\n\n`;
    if (relatedTasks.length > 0) {
        md += `## 关联任务\n${relatedTasks.map(t => `- ${t}`).join('\n')}\n\n`;
    }
    if (categorized.features.length > 0) {
        md += `## ✨ 新功能\n`;
        for (const c of categorized.features) {
            md += `- ${c.subject} (${c.shortHash})\n`;
        }
        md += '\n';
    }
    if (categorized.fixes.length > 0) {
        md += `## 🐛 Bug 修复\n`;
        for (const c of categorized.fixes) {
            md += `- ${c.subject} (${c.shortHash})\n`;
        }
        md += '\n';
    }
    if (categorized.improvements.length > 0) {
        md += `## 🚀 改进优化\n`;
        for (const c of categorized.improvements) {
            md += `- ${c.subject} (${c.shortHash})\n`;
        }
        md += '\n';
    }
    if (categorized.technical.length > 0) {
        md += `## 🔧 技术改动\n`;
        for (const c of categorized.technical) {
            md += `- ${c.subject} (${c.shortHash})\n`;
        }
        md += '\n';
    }
    const changedFiles = fileChanges.filter(f => f.status !== 'deleted');
    if (changedFiles.length > 0) {
        md += `## 📁 改动文件 (${changedFiles.length})\n`;
        for (const f of changedFiles.slice(0, 20)) {
            md += `- ${f.path} (+${f.additions} -${f.deletions})\n`;
        }
        if (changedFiles.length > 20) {
            md += `- ...还有 ${changedFiles.length - 20} 个文件\n`;
        }
        md += '\n';
    }
    return md;
}
/**
 * Generate version changelog for a specific tag
 */
export async function generateVersionChangelog(repoPath, versionTag, relatedTasks = []) {
    let commits = [];
    let fileChanges = [];
    try {
        // Get commits since last tag
        const lastTagRef = execSync(`git rev-list --tags-order-by-version --max-count=1 --exclude=${versionTag} HEAD~10..HEAD 2>/dev/null | tail -1 || echo ''`, { cwd: repoPath, encoding: 'utf-8', timeout: 10000 }).trim();
        const range = lastTagRef ? `${lastTagRef}..${versionTag}` : `${versionTag}~10..${versionTag}`;
        const logOutput = execSync(`git log ${range} --pretty=format:"%H%n%an  %ae  %ad%n%s%n%b" --date=iso`, { cwd: repoPath, encoding: 'utf-8', timeout: 10000 });
        commits = parseGitLog(logOutput);
        fileChanges = getFileChanges(repoPath, lastTagRef || `${versionTag}~10`, versionTag);
    }
    catch {
        // Fallback: try to get log for this tag specifically
        try {
            const logOutput = execSync(`git log ${versionTag}~5..${versionTag} --pretty=format:"%H%n%an  %ae  %ad%n%s%n%b" --date=iso`, { cwd: repoPath, encoding: 'utf-8', timeout: 10000 });
            commits = parseGitLog(logOutput);
        }
        catch {
            // No commits found
        }
    }
    const categorized = {
        features: commits.filter(c => categorizeCommit(c) === 'feature'),
        fixes: commits.filter(c => categorizeCommit(c) === 'fix'),
        improvements: commits.filter(c => categorizeCommit(c) === 'improvement'),
        technical: commits.filter(c => categorizeCommit(c) === 'technical')
    };
    const markdown = generateChangelogMarkdown(versionTag, commits, fileChanges, relatedTasks);
    // Save screenshots directory path
    const screenshotsDir = path.join(VERSIONS_BASE_DIR, versionTag, 'screenshots');
    let screenshots = [];
    try {
        if (fs.existsSync(screenshotsDir)) {
            screenshots = fs.readdirSync(screenshotsDir)
                .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
                .map(f => path.join(screenshotsDir, f));
        }
    }
    catch {
        // ignore
    }
    return {
        versionTag,
        generatedAt: new Date().toISOString(),
        markdown,
        commitCount: commits.length,
        fileChanges,
        summary: categorized,
        screenshots
    };
}
/**
 * Save changelog to disk
 */
export function saveChangelog(versionTag, markdown) {
    const dir = path.join(VERSIONS_BASE_DIR, versionTag);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'summary.md');
    fs.writeFileSync(filePath, markdown, 'utf-8');
    return filePath;
}
/**
 * Load saved changelog
 */
export function loadChangelog(versionTag) {
    const filePath = path.join(VERSIONS_BASE_DIR, versionTag, 'summary.md');
    try {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
        }
    }
    catch {
        // ignore
    }
    return null;
}

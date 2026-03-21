/**
 * Git Service — Git operations for version management
 * Handles: git log, tag creation, branch listing, current branch, commit diff
 */
import { execSync, exec } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
function execGit(cwd, args) {
    try {
        return execSync('git ' + args.join(' '), {
            cwd,
            encoding: 'utf-8',
            timeout: 30000,
        });
    }
    catch (err) {
        const e = err;
        throw new Error(`Git command failed: ${e?.message || e?.stderr || 'unknown error'}`);
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _execGitAsync(cwd, args) {
    return new Promise((resolve, reject) => {
        exec('git ' + args.join(' '), { cwd, encoding: 'utf-8', timeout: 30000 }, (err, stdout, stderr) => {
            if (err)
                reject(new Error(stderr || err.message));
            else
                resolve(stdout);
        });
    });
}
/**
 * Get commit history for a directory or specific tag/branch
 */
export function getGitLog(cwd, options = {}) {
    const { maxCount = 50, tag, branch, since } = options;
    if (!existsSync(join(cwd, '.git'))) {
        return [];
    }
    const ref = tag || branch || 'HEAD';
    const args = [
        'log',
        ref,
        `--max-count=${maxCount}`,
        '--pretty=format:%H||%h||%s||%an||%ae||%aI',
        '--shortstat',
    ];
    if (since) {
        args.push(`--since=${since}`);
    }
    try {
        const output = execGit(cwd, args);
        const lines = output.split('\n').filter(Boolean);
        const commits = [];
        for (const line of lines) {
            if (line.includes('||')) {
                const parts = line.split('||');
                if (parts.length >= 6) {
                    const [hash, shortHash, message, author, authorEmail, date] = parts;
                    commits.push({ hash, shortHash, message, author, authorEmail, date });
                }
            }
            else if (line.includes('file') || line.includes('insertion') || line.includes('deletion')) {
                // This is a --shortstat line
                const lastCommit = commits[commits.length - 1];
                if (lastCommit) {
                    const filesMatch = line.match(/(\d+) file/);
                    const insMatch = line.match(/(\d+) insertion/);
                    const delMatch = line.match(/(\d+) deletion/);
                    if (filesMatch)
                        lastCommit.filesChanged = parseInt(filesMatch[1]);
                    if (insMatch)
                        lastCommit.insertions = parseInt(insMatch[1]);
                    if (delMatch)
                        lastCommit.deletions = parseInt(delMatch[1]);
                }
            }
        }
        return commits;
    }
    catch {
        return [];
    }
}
/**
 * Get list of all tags
 */
export function getTags(cwd) {
    if (!existsSync(join(cwd, '.git')))
        return [];
    try {
        const output = execGit(cwd, ['tag', '-l', '--format=%(refname:short)||%(objectname)||%(creatordate:iso)', '--sort=-creatordate']);
        const lines = output.split('\n').filter(Boolean);
        return lines.map(line => {
            const parts = line.split('||');
            return {
                name: parts[0] || '',
                commit: parts[1] || '',
                date: parts[2] || '',
            };
        }).filter(t => t.name);
    }
    catch {
        return [];
    }
}
/**
 * Create a git tag
 */
export function createTag(cwd, tagName, message) {
    if (!existsSync(join(cwd, '.git')))
        return false;
    try {
        if (message) {
            execGit(cwd, ['tag', '-a', tagName, '-m', message]);
        }
        else {
            execGit(cwd, ['tag', tagName]);
        }
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Delete a git tag
 */
export function deleteTag(cwd, tagName) {
    if (!existsSync(join(cwd, '.git')))
        return false;
    try {
        execGit(cwd, ['tag', '-d', tagName]);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get list of branches
 */
export function getBranches(cwd) {
    if (!existsSync(join(cwd, '.git')))
        return [];
    try {
        const output = execGit(cwd, ['branch', '-a', '--format=%(refname:short)||%(HEAD)']);
        const lines = output.split('\n').filter(Boolean);
        return lines.map(line => {
            const parts = line.split('||');
            const name = parts[0]?.trim() || '';
            const isCurrent = parts[1]?.trim() === '*';
            return {
                name,
                isCurrent,
                isRemote: name.startsWith('remotes/') || name.startsWith('origin/'),
            };
        }).filter(b => b.name);
    }
    catch {
        return [];
    }
}
/**
 * Get current branch name
 */
export function getCurrentBranch(cwd) {
    if (!existsSync(join(cwd, '.git')))
        return '';
    try {
        const output = execGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
        return output.trim();
    }
    catch {
        return '';
    }
}
/**
 * Create a new branch
 */
export function createBranch(cwd, branchName, baseRef) {
    if (!existsSync(join(cwd, '.git')))
        return false;
    try {
        if (baseRef) {
            execGit(cwd, ['checkout', '-b', branchName, baseRef]);
        }
        else {
            execGit(cwd, ['checkout', '-b', branchName]);
        }
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Checkout a specific tag or branch
 */
export function checkout(cwd, ref) {
    if (!existsSync(join(cwd, '.git')))
        return false;
    try {
        execGit(cwd, ['checkout', ref]);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get diff stats between two refs
 */
export function getDiffStats(cwd, fromRef, toRef) {
    if (!existsSync(join(cwd, '.git'))) {
        return { files: [], insertions: 0, deletions: 0 };
    }
    try {
        const output = execGit(cwd, ['diff', '--stat', `${fromRef}..${toRef}`]);
        const lines = output.split('\n');
        const files = [];
        let insertions = 0;
        let deletions = 0;
        for (const line of lines) {
            const match = line.match(/^\s*(.+?)\s*\|\s*\d+/);
            if (match)
                files.push(match[1].trim());
            const insMatch = line.match(/(\d+)\s+insertion/);
            const delMatch = line.match(/(\d+)\s+deletion/);
            if (insMatch)
                insertions += parseInt(insMatch[1]);
            if (delMatch)
                deletions += parseInt(delMatch[1]);
        }
        return { files, insertions, deletions };
    }
    catch {
        return { files: [], insertions: 0, deletions: 0 };
    }
}
/**
 * Check if a tag exists
 */
export function tagExists(cwd, tagName) {
    if (!existsSync(join(cwd, '.git')))
        return false;
    try {
        execGit(cwd, ['rev-parse', tagName]);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get the commit hash for a tag
 */
export function getTagCommit(cwd, tagName) {
    if (!existsSync(join(cwd, '.git')))
        return '';
    try {
        const output = execGit(cwd, ['rev-parse', tagName]);
        return output.trim();
    }
    catch {
        return '';
    }
}
/**
 * Get detailed info about a git tag including author, date, message, annotation
 */
export function getTagDetails(cwd, tagName) {
    if (!existsSync(join(cwd, '.git')))
        return null;
    try {
        // Use git show to get tag details - works for both annotated and lightweight tags
        // Format: name||commit||tagger-date||author-name||author-email||tagger-name||tagger-email||subject
        const output = execGit(cwd, [
            'for-each-ref',
            '--format=%(refname:short)||%(objectname)||%(taggerdate:iso)||%(authorname)||%(authoremail)||%(taggername)||%(taggeremail)||%(contents:subject)',
            `refs/tags/${tagName}`,
        ]);
        if (!output.trim())
            return null;
        const parts = output.trim().split('||');
        if (parts.length < 8)
            return null;
        const [name, commit, taggerDate, author, authorEmail, taggerName, taggerEmail, message] = parts;
        return {
            name: name || tagName,
            commit: commit || '',
            date: taggerDate || '',
            message: message || '',
            author: author || taggerName || '',
            authorEmail: authorEmail || taggerEmail || '',
            taggerDate: taggerDate || '',
            taggerName: taggerName || '',
            taggerEmail: taggerEmail || '',
        };
    }
    catch {
        return null;
    }
}
/**
 * Get list of commits between two refs
 */
export function getCommitsBetween(cwd, fromRef, toRef) {
    if (!existsSync(join(cwd, '.git')))
        return [];
    try {
        const output = execGit(cwd, [
            'log',
            `${fromRef}..${toRef}`,
            '--pretty=format:%H||%h||%s||%an||%ae||%aI',
        ]);
        const lines = output.split('\n').filter(Boolean);
        return lines.map(line => {
            const parts = line.split('||');
            if (parts.length >= 6) {
                const [hash, shortHash, message, author, authorEmail, date] = parts;
                return { hash, shortHash, message, author, authorEmail, date };
            }
            return { hash: '', shortHash: '', message: '', author: '', authorEmail: '', date: '' };
        }).filter(c => c.hash);
    }
    catch {
        return [];
    }
}
/**
 * Compare two branches — get ahead/behind commit counts
 * Returns { ahead, behind } where:
 *   ahead = commits in branch but not in baseBranch
 *   behind = commits in baseBranch but not in branch
 */
export function compareBranches(cwd, branch, baseBranch) {
    if (!existsSync(join(cwd, '.git')))
        return { ahead: 0, behind: 0 };
    try {
        // git rev-list --left-right --count base...branch
        // left (behind) = commits in baseBranch not in branch
        // right (ahead) = commits in branch not in baseBranch
        const output = execGit(cwd, [
            'rev-list',
            '--left-right',
            '--count',
            `${baseBranch}...${branch}`,
        ]);
        const [behind, ahead] = output.trim().split('\t').map(n => parseInt(n) || 0);
        return { ahead, behind };
    }
    catch {
        return { ahead: 0, behind: 0 };
    }
}

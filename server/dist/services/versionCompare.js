/**
 * versionCompare.ts — Version comparison service
 * Compares two versions: commits, files, and changelogs
 */
import { getGitLog } from './gitService.js';
import { generateChangelogFromCommits } from './changelogGenerator.js';
import { compareVersions } from './semver.js';
import path from 'path';
import os from 'os';
/**
 * Get project path for a version
 */
function getProjectPath(versionId) {
    return path.join(process.env.TEAMCLAW_PROJECTS_DIR || `${os.homedir()}/.openclaw/projects`, versionId);
}
/**
 * Fetch commits for a version (by tag or branch)
 */
export async function getVersionCommits(versionId, ref, maxCount = 50) {
    try {
        const projectPath = getProjectPath(versionId);
        const commits = getGitLog(projectPath, { maxCount, branch: ref });
        return commits.map(c => ({
            hash: c.hash,
            message: c.message,
            author: c.author,
            date: c.date,
            files: c.files,
        }));
    }
    catch {
        // Return empty if git log fails (e.g. no repo)
        return [];
    }
}
/**
 * Generate changelog for a version from its commits
 */
export async function generateVersionChangelog(versionId, commits, branchName) {
    if (commits.length === 0)
        return null;
    const commitText = commits
        .map(c => `${c.hash.slice(0, 7)} ${c.message}`)
        .join('\n');
    try {
        const result = await generateChangelogFromCommits(versionId, commitText, branchName);
        return {
            title: result.title,
            content: result.content,
            features: result.features,
            fixes: result.fixes,
            improvements: result.improvements,
            breaking: result.breaking,
            docs: result.docs,
        };
    }
    catch {
        return null;
    }
}
/**
 * Compare commits between two versions
 */
function compareCommits(fromCommits, toCommits) {
    const fromHashes = new Set(fromCommits.map(c => c.hash.slice(0, 7)));
    const toHashes = new Set(toCommits.map(c => c.hash.slice(0, 7)));
    const onlyFrom = fromCommits.filter(c => !toHashes.has(c.hash.slice(0, 7)));
    const onlyTo = toCommits.filter(c => !fromHashes.has(c.hash.slice(0, 7)));
    const shared = toCommits.filter(c => fromHashes.has(c.hash.slice(0, 7)));
    return {
        onlyFrom,
        onlyTo,
        shared,
        totalFrom: fromCommits.length,
        totalTo: toCommits.length,
    };
}
/**
 * Compare files between two versions based on commit file lists
 */
function compareFiles(fromCommits, toCommits) {
    const fromFiles = new Set();
    const toFiles = new Set();
    fromCommits.forEach(c => c.files?.forEach(f => fromFiles.add(f)));
    toCommits.forEach(c => c.files?.forEach(f => toFiles.add(f)));
    const added = [...toFiles].filter(f => !fromFiles.has(f));
    const removed = [...fromFiles].filter(f => !toFiles.has(f));
    const modified = [...toFiles].filter(f => fromFiles.has(f));
    return {
        added,
        removed,
        modified,
        totalFrom: fromFiles.size,
        totalTo: toFiles.size,
    };
}
/**
 * Generate a summary from the comparison
 */
function generateSummary(fromVersion, toVersion, result) {
    const newerIsAhead = compareVersions(toVersion, fromVersion) > 0;
    const commitDelta = result.commits.totalTo - result.commits.totalFrom;
    const fileDelta = result.files.totalTo - result.files.totalFrom;
    const hasBreakingChanges = (result.changelogs.to?.breaking.length ?? 0) > 0;
    let recommendation = '';
    if (hasBreakingChanges) {
        recommendation = '包含破坏性变更，建议发布前充分测试并更新相关依赖';
    }
    else if (commitDelta > 10) {
        recommendation = '较大版本更新，建议检查新增功能的兼容性';
    }
    else if (commitDelta > 0) {
        recommendation = '常规迭代，建议安排回归测试';
    }
    else if (commitDelta < 0) {
        recommendation = `${toVersion} 提交数少于 ${fromVersion}，可能是回退版本`;
    }
    else {
        recommendation = '两个版本提交数量相当，未检测到显著差异';
    }
    return {
        newerIsAhead,
        commitDelta,
        fileDelta,
        hasBreakingChanges,
        recommendation,
    };
}
/**
 * Main comparison function — compare two versions
 */
export async function compareTwoVersions(fromVersionId, toVersionId, fromVersionTag, toVersionTag) {
    // Fetch commits for both versions in parallel
    const [fromCommits, toCommits] = await Promise.all([
        getVersionCommits(fromVersionId, fromVersionTag),
        getVersionCommits(toVersionId, toVersionTag),
    ]);
    // Compare commits
    const commits = compareCommits(fromCommits, toCommits);
    // Compare files
    const files = compareFiles(fromCommits, toCommits);
    // Generate changelogs
    const [fromChangelog, toChangelog] = await Promise.all([
        generateVersionChangelog(fromVersionId, commits.onlyFrom, fromVersionTag),
        generateVersionChangelog(toVersionId, commits.onlyTo, toVersionTag),
    ]);
    const changelogs = { from: fromChangelog, to: toChangelog };
    const summary = generateSummary(fromVersionTag, toVersionTag, { commits, files, changelogs });
    return {
        fromVersion: fromVersionTag,
        toVersion: toVersionTag,
        commits,
        files,
        changelogs,
        summary,
    };
}
/**
 * Quick compare — just check if there are differences
 */
export async function quickCompare(fromVersionId, toVersionId, fromTag, toTag) {
    try {
        const result = await compareTwoVersions(fromVersionId, toVersionId, fromTag, toTag);
        const hasDiff = result.commits.onlyTo.length > 0 ||
            result.files.added.length > 0 ||
            result.files.removed.length > 0 ||
            result.files.modified.length > 0;
        const summary = hasDiff
            ? `${toTag} 相比 ${fromTag}：${result.commits.onlyTo.length} 个新提交，+${result.files.added.length} 文件，-${result.files.removed.length} 文件`
            : `两个版本之间未检测到差异`;
        return { hasDiff, summary };
    }
    catch (err) {
        return {
            hasDiff: false,
            summary: `比较失败: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}

/**
 * semver.ts — Semantic Versioning utilities
 * Parsing, comparison, and validation of semver strings
 */
/**
 * Parse a version string into its components
 */
export function parseSemver(version) {
    // Strip leading 'v' or 'V' if present
    const normalized = version.startsWith('v') || version.startsWith('V')
        ? version.slice(1)
        : version;
    // Basic semver regex: major.minor.patch[-prerelease][+build]
    const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
    if (!match)
        return null;
    return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
        prerelease: match[4] ? match[4].split('.').filter(Boolean) : [],
        build: match[5] ? match[5].split('.').filter(Boolean) : [],
        raw: `${match[1]}.${match[2]}.${match[3]}`,
        original: version,
    };
}
/**
 * Format a ParsedSemver back to string
 */
export function formatSemver(parsed, includeV = true) {
    const base = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
    const pre = parsed.prerelease.length > 0 ? `-${parsed.prerelease.join('.')}` : '';
    const build = parsed.build.length > 0 ? `+${parsed.build.join('.')}` : '';
    return (includeV ? 'v' : '') + base + pre + build;
}
/**
 * Compare two version strings
 * Returns: negative if a < b, 0 if a === b, positive if a > b
 */
export function compareVersions(a, b) {
    const pa = parseSemver(a);
    const pb = parseSemver(b);
    if (!pa || !pb)
        return a.localeCompare(b);
    // Compare major.minor.patch
    if (pa.major !== pb.major)
        return pa.major - pb.major;
    if (pa.minor !== pb.minor)
        return pa.minor - pb.minor;
    if (pa.patch !== pb.patch)
        return pa.patch - pb.patch;
    // Prerelease: no prerelease > has prerelease
    if (pa.prerelease.length === 0 && pb.prerelease.length > 0)
        return 1;
    if (pa.prerelease.length > 0 && pb.prerelease.length === 0)
        return -1;
    if (pa.prerelease.length > 0 && pb.prerelease.length > 0) {
        const preCompare = pa.prerelease
            .map((p, i) => p.localeCompare(pb.prerelease[i] || ''))
            .find(c => c !== 0) ?? 0;
        if (preCompare !== 0)
            return preCompare;
    }
    return 0;
}
/**
 * Check if version a is greater than version b
 */
export function isGreaterThan(a, b) {
    return compareVersions(a, b) > 0;
}
/**
 * Check if version a is less than version b
 */
export function isLessThan(a, b) {
    return compareVersions(a, b) < 0;
}
/**
 * Check if version is valid semver
 */
export function isValidSemver(version) {
    return parseSemver(version) !== null;
}
/**
 * Calculate distance between two versions
 */
export function versionDistance(from, to) {
    const a = parseSemver(from);
    const b = parseSemver(to);
    if (!a || !b)
        return null;
    if (compareVersions(to, from) < 0) {
        // Reverse: calculate going backward
        const rev = versionDistance(to, from);
        if (!rev)
            return null;
        return { ...rev, level: rev.level, distance: rev.distance, from, to };
    }
    // Calculate distance in patches
    let level = 'patch';
    let distance = 0;
    if (b.major !== a.major) {
        level = 'major';
        // Count major bumps
        for (let m = a.major; m < b.major; m++)
            distance++;
        return { level, distance, from, to };
    }
    if (b.minor !== a.minor) {
        level = 'minor';
        for (let m = a.minor; m < b.minor; m++)
            distance++;
        return { level, distance, from, to };
    }
    level = 'patch';
    distance = Math.max(0, b.patch - a.patch);
    return { level, distance: distance || 1, from, to };
}
/**
 * Get the next version given a bump type
 */
export function bumpVersion(current, type) {
    const parsed = parseSemver(current);
    if (!parsed)
        return null;
    const bumped = { ...parsed };
    switch (type) {
        case 'major':
            bumped.major += 1;
            bumped.minor = 0;
            bumped.patch = 0;
            break;
        case 'minor':
            bumped.minor += 1;
            bumped.patch = 0;
            break;
        case 'patch':
            bumped.patch += 1;
            break;
    }
    // Clear prerelease on bump (new release)
    bumped.prerelease = [];
    bumped.build = [];
    return formatSemver(bumped, current.startsWith('v'));
}
/**
 * Sort versions descending (newest first)
 */
export function sortVersions(versions) {
    return [...versions].sort((a, b) => compareVersions(b, a));
}
/**
 * Get the latest version from a list
 */
export function getLatestVersion(versions) {
    if (versions.length === 0)
        return null;
    return sortVersions(versions)[0];
}
const TASK_TYPE_BUMP_MAP = {
    // Feature/new function
    feature: 'minor',
    feat: 'minor',
    新功能: 'minor',
    新增: 'minor',
    // Bug fix
    fix: 'patch',
    bugfix: 'patch',
    修复: 'patch',
    bug: 'patch',
    // Improvements
    improvement: 'patch',
    improve: 'patch',
    优化: 'patch',
    改进: 'patch',
    // Refactoring (minor bump)
    refactor: 'minor',
    重构: 'minor',
    // Breaking changes (major bump)
    breaking: 'major',
    break: 'major',
    破坏性: 'major',
    // Hotfix (patch bump)
    hotfix: 'patch',
    // Documentation
    docs: 'patch',
    文档: 'patch',
};
/**
 * Determine bump level from task type string
 */
export function bumpLevelFromTaskType(taskType) {
    const lower = taskType.toLowerCase();
    for (const [key, level] of Object.entries(TASK_TYPE_BUMP_MAP)) {
        if (lower.includes(key))
            return level;
    }
    return 'patch'; // default
}

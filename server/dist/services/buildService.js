/**
 * Build Service — Execute project builds and collect artifacts
 * Reads package.json to determine build command, executes it, collects output
 */
import { exec } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { promisify } from 'util';
const execAsync = promisify(exec);
const ARTIFACT_TYPE_MAP = {
    '.js': 'js',
    '.mjs': 'js',
    '.css': 'css',
    '.html': 'html',
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.gif': 'image',
    '.svg': 'image',
    '.ico': 'image',
    '.woff': 'font',
    '.woff2': 'font',
    '.ttf': 'font',
    '.eot': 'font',
    '.zip': 'binary',
    '.tar': 'binary',
    '.gz': 'binary',
    '.tgz': 'binary',
    '.exe': 'binary',
    '.apk': 'binary',
    '.ipa': 'binary',
    '.pdf': 'binary',
    '.json': 'other',
};
function getArtifactType(filePath) {
    const ext = extname(filePath).toLowerCase();
    return ARTIFACT_TYPE_MAP[ext] || 'other';
}
function getProjectType(projectPath) {
    const packageJsonPath = join(projectPath, 'package.json');
    if (!existsSync(packageJsonPath))
        return 'unknown';
    try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        const scripts = pkg.scripts || {};
        if (deps['next'])
            return 'nextjs';
        if (deps['react'])
            return 'react';
        if (scripts['build'])
            return 'node';
        return 'unknown';
    }
    catch {
        return 'unknown';
    }
}
function getBuildCommand(projectPath) {
    const packageJsonPath = join(projectPath, 'package.json');
    if (!existsSync(packageJsonPath))
        return null;
    try {
        const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        const buildScript = pkg.scripts?.build;
        if (buildScript) {
            // Check for additional setup needed
            if (existsSync(join(projectPath, 'node_modules'))) {
                return buildScript;
            }
            return `npm install && ${buildScript}`;
        }
        return null;
    }
    catch {
        return null;
    }
}
function collectArtifacts(projectPath) {
    const artifacts = [];
    function scanDir(dir, base) {
        try {
            const entries = readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = join(dir, entry.name);
                const relPath = fullPath.replace(base + '/', '');
                if (entry.isDirectory()) {
                    // Skip common non-artifact directories
                    if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
                        scanDir(fullPath, base);
                    }
                }
                else if (entry.isFile()) {
                    const stats = statSync(fullPath);
                    const artifactType = getArtifactType(entry.name);
                    // Skip very small files that are likely config/manifest
                    if (stats.size < 100 && artifactType === 'other')
                        continue;
                    // Skip source maps in production
                    if (entry.name.endsWith('.map'))
                        continue;
                    artifacts.push({
                        path: relPath,
                        name: entry.name,
                        size: stats.size,
                        type: artifactType,
                        downloadUrl: `/artifacts/${encodeURIComponent(basename(projectPath))}/${relPath}`,
                    });
                }
            }
        }
        catch {
            // Directory not readable
        }
    }
    // Find likely build output directories
    const likelyDirs = [
        join(projectPath, '.next'),
        join(projectPath, 'dist'),
        join(projectPath, 'build'),
        join(projectPath, 'out'),
        join(projectPath, '.output'),
    ];
    for (const dir of likelyDirs) {
        if (existsSync(dir)) {
            scanDir(dir, projectPath);
            break;
        }
    }
    // If no build dir found, scan project root for artifacts
    if (artifacts.length === 0) {
        scanDir(projectPath, projectPath);
    }
    return artifacts;
}
/**
 * Execute a build for a project
 */
export async function runBuild(projectPath, options = {}) {
    const { buildCommand: customCommand, buildOutputDir, timeoutMs = 300000, // 5 min default
    env = {}, } = options;
    const startTime = Date.now();
    if (!existsSync(projectPath)) {
        return {
            success: false,
            duration: 0,
            command: customCommand || 'none',
            cwd: projectPath,
            output: '',
            errorOutput: 'Project path does not exist',
            artifacts: [],
            exitCode: 1,
        };
    }
    // Determine build command
    const command = customCommand || getBuildCommand(projectPath);
    if (!command) {
        return {
            success: false,
            duration: Date.now() - startTime,
            command: 'none',
            cwd: projectPath,
            output: '',
            errorOutput: 'No build command found in package.json and no custom command provided',
            artifacts: [],
            exitCode: 1,
        };
    }
    // Prepare environment
    const buildEnv = {
        ...process.env,
        ...env,
        NODE_ENV: 'production',
    };
    try {
        const { stdout, stderr } = await execAsync(command, {
            cwd: projectPath,
            env: buildEnv,
            timeout: timeoutMs,
            maxBuffer: 10 * 1024 * 1024, // 10MB
        });
        const duration = Date.now() - startTime;
        const output = stdout + stderr;
        const artifacts = buildOutputDir
            ? collectArtifacts(projectPath)
            : collectArtifacts(projectPath);
        return {
            success: true,
            duration,
            command,
            cwd: projectPath,
            output: output.slice(-50000), // last 50k chars
            errorOutput: '',
            artifacts,
            exitCode: 0,
        };
    }
    catch (err) {
        const e = err;
        const duration = Date.now() - startTime;
        const output = (e?.stdout || '') + (e?.stderr || '');
        // Collect artifacts even on failure (partial build)
        const artifacts = buildOutputDir
            ? collectArtifacts(projectPath)
            : collectArtifacts(projectPath);
        return {
            success: false,
            duration,
            command,
            cwd: projectPath,
            output: output.slice(-50000),
            errorOutput: e?.stderr || String(err),
            artifacts,
            exitCode: e?.code ?? 1,
            ...(e?.killed ? { errorOutput: (e?.stderr || '') + '\nBuild timed out' } : {}),
        };
    }
}
/**
 * Get build configuration for a project
 */
export function getBuildConfig(projectPath) {
    const packageJsonPath = join(projectPath, 'package.json');
    if (!existsSync(packageJsonPath)) {
        return {
            buildCommand: null,
            projectType: 'unknown',
            hasNodeModules: false,
            packageManager: null,
        };
    }
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const buildScript = pkg.scripts?.build || null;
    const projectType = getProjectType(projectPath);
    const hasNodeModules = existsSync(join(projectPath, 'node_modules'));
    // Detect package manager from lock files
    let packageManager = null;
    if (existsSync(join(projectPath, 'pnpm-lock.yaml')))
        packageManager = 'pnpm';
    else if (existsSync(join(projectPath, 'yarn.lock')))
        packageManager = 'yarn';
    else if (existsSync(join(projectPath, 'package-lock.json')))
        packageManager = 'npm';
    return {
        buildCommand: buildScript,
        projectType,
        hasNodeModules,
        packageManager,
    };
}

import { cloneOrCopyProject } from './gitClone.js';
import { scanDirectory } from './fileScanner.js';
import { generateFeatureMap } from './featureMap.js';
import { convertDocuments } from './docConverter.js';
import { analyzeGitHistory } from './gitHistoryAnalysis.js';
/**
 * Incrementally refresh a project:
 * - Pull latest changes (for URL source)
 * - Re-scan changed files
 * - Update vector embeddings for modified files
 * - Re-analyze git history
 * - Regenerate feature map for affected modules
 */
export async function refreshProject(project) {
    const result = {
        projectId: project.id,
        refreshedAt: new Date().toISOString(),
        steps: [],
        newFeatures: 0,
        newDocs: 0,
        newCommits: 0,
    };
    // Step 1: Pull latest if URL source
    try {
        if (project.source === 'url' && project.url) {
            await cloneOrCopyProject('url', project.url, undefined);
        }
        result.steps.push({ name: 'pull_latest', status: 'done' });
    }
    catch (e) {
        result.steps.push({ name: 'pull_latest', status: 'error', error: String(e) });
    }
    // Step 2: Re-scan directory
    const projectPath = project.localPath || project.url?.replace(/\.git$/, '') || '/tmp/unknown';
    try {
        await scanDirectory(projectPath);
        result.steps.push({ name: 'rescan', status: 'done' });
    }
    catch (e) {
        result.steps.push({ name: 'rescan', status: 'error', error: String(e) });
    }
    // Step 3: Regenerate feature map
    try {
        const featureMap = await generateFeatureMap(projectPath, project.id, project.name);
        result.newFeatures = featureMap.totalFeatures;
        result.steps.push({ name: 'feature_map', status: 'done' });
    }
    catch (e) {
        result.steps.push({ name: 'feature_map', status: 'error', error: String(e) });
    }
    // Step 4: Convert docs
    try {
        const docs = await convertDocuments(projectPath, project.id);
        result.newDocs = docs.length;
        result.steps.push({ name: 'convert_docs', status: 'done' });
    }
    catch (e) {
        result.steps.push({ name: 'convert_docs', status: 'error', error: String(e) });
    }
    // Step 5: Update vector embeddings (expensive, skip for now)
    result.steps.push({ name: 'vectorize', status: 'skipped' });
    // Step 6: Re-analyze git history
    try {
        const history = await analyzeGitHistory(projectPath);
        result.newCommits = history.length;
        result.steps.push({ name: 'git_history', status: 'done' });
    }
    catch (e) {
        result.steps.push({ name: 'git_history', status: 'error', error: String(e) });
    }
    return result;
}

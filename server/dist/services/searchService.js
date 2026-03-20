import { docService } from './docService.js';
// 文档全文搜索
function searchDocs(query, page = 1, pageSize = 10) {
    const docs = docService.getDocList();
    const results = [];
    const q = query.toLowerCase();
    for (const doc of docs) {
        const content = doc.name.toLowerCase();
        if (content.includes(q)) {
            results.push({
                type: 'doc',
                id: doc.id,
                title: doc.name,
                snippet: `文档类型: ${doc.type}, 大小: ${formatSize(doc.size)}, 上传: ${doc.uploadedAt}`,
                url: `/docs/${doc.id}`,
                score: content.includes(q) ? 1 : 0.5,
            });
        }
    }
    // 按分数排序
    results.sort((a, b) => b.score - a.score);
    const total = results.length;
    const list = results.slice((page - 1) * pageSize, page * pageSize);
    return { list, total };
}
// 任务搜索（基于内存任务队列）
async function searchTasks(query, page = 1, pageSize = 10) {
    // 动态导入避免循环依赖
    const { taskLifecycle } = await import('./taskLifecycle.js');
    const tasks = taskLifecycle.getTasks ? taskLifecycle.getTasks() : [];
    const results = [];
    const q = query.toLowerCase();
    for (const task of tasks) {
        const title = (task.title || '').toLowerCase();
        const desc = (task.description || '').toLowerCase();
        if (title.includes(q) || desc.includes(q)) {
            results.push({
                type: 'task',
                id: task.id,
                title: task.title || task.id,
                snippet: `状态: ${task.status} | ${desc.slice(0, 100)}`,
                url: `/tasks/${task.id}`,
                score: title.includes(q) ? 1 : 0.7,
            });
        }
    }
    results.sort((a, b) => b.score - a.score);
    const total = results.length;
    const list = results.slice((page - 1) * pageSize, page * pageSize);
    return { list, total };
}
function formatSize(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
export const searchService = {
    searchDocs,
    searchTasks,
    async globalSearch(query, page = 1, pageSize = 10) {
        const docResults = searchDocs(query, page, pageSize);
        const taskResults = await searchTasks(query, page, pageSize);
        return { docs: docResults, tasks: taskResults };
    },
};

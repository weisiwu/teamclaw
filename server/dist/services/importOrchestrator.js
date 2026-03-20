export const ALL_STEPS = [
    'scan',
    'detectTech',
    'parseDocs',
    'analyzeCode',
    'buildSummary',
    'generateSkills',
    'vectorize',
    'done',
];
const STEP_NAMES = {
    scan: '扫描文件结构',
    detectTech: '检测技术栈',
    parseDocs: '解析文档',
    analyzeCode: '分析代码结构',
    buildSummary: '生成项目摘要',
    generateSkills: '生成 Skills',
    vectorize: '向量化存储',
    done: '完成',
};
// In-memory task store (swap for DB later)
const tasks = new Map();
export function createImportTask(projectId) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const steps = ALL_STEPS.map((name, i) => ({
        step: i + 1,
        name,
        status: 'pending',
    }));
    const task = {
        taskId,
        projectId,
        status: 'pending',
        currentStep: 0,
        totalSteps: steps.length,
        steps,
        startedAt: new Date().toISOString(),
    };
    tasks.set(taskId, task);
    return task;
}
export function executeStep(taskId, stepIndex) {
    const task = tasks.get(taskId);
    if (!task)
        throw new Error(`Task ${taskId} not found`);
    task.status = 'processing';
    task.currentStep = stepIndex + 1;
    // Mark current and prior steps
    task.steps.forEach((s, i) => {
        if (i < stepIndex)
            s.status = 'done';
        if (i === stepIndex)
            s.status = 'running';
    });
    tasks.set(taskId, task);
    return task;
}
export function completeStep(taskId, stepIndex, errorMsg) {
    const task = tasks.get(taskId);
    if (!task)
        throw new Error(`Task ${taskId} not found`);
    const step = task.steps[stepIndex];
    if (errorMsg) {
        step.status = 'error';
        step.error = errorMsg;
        task.status = 'error';
    }
    else {
        step.status = 'done';
        task.currentStep = stepIndex + 1;
    }
    // Mark done if last step
    if (stepIndex === task.steps.length - 1) {
        task.status = errorMsg ? 'error' : 'done';
        task.completedAt = new Date().toISOString();
    }
    tasks.set(taskId, task);
    return task;
}
export function getTaskStatus(taskId) {
    return tasks.get(taskId);
}
export function stepDisplayName(step) {
    return STEP_NAMES[step] ?? step;
}

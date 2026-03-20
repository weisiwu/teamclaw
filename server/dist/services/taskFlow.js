/**
 * Task Flow 服务
 * 任务机制模块 - 任务流转与依赖管理
 *
 * 管理父子任务链、依赖关系、级联取消
 */
import { taskLifecycle } from './taskLifecycle.js';
class TaskFlowService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!TaskFlowService.instance) {
            TaskFlowService.instance = new TaskFlowService();
        }
        return TaskFlowService.instance;
    }
    /**
     * 添加子任务
     */
    addSubtask(parentTaskId, subtaskId) {
        const parent = taskLifecycle.getTask(parentTaskId);
        if (!parent)
            return false;
        if (!parent.subtaskIds.includes(subtaskId)) {
            parent.subtaskIds.push(subtaskId);
        }
        return true;
    }
    /**
     * 设置依赖关系
     */
    addDependency(taskId, dependsOnTaskId) {
        const task = taskLifecycle.getTask(taskId);
        const dependency = taskLifecycle.getTask(dependsOnTaskId);
        if (!task || !dependency)
            return false;
        if (!task.dependsOn.includes(dependsOnTaskId)) {
            task.dependsOn.push(dependsOnTaskId);
        }
        if (!dependency.blockingTasks.includes(taskId)) {
            dependency.blockingTasks.push(taskId);
        }
        return true;
    }
    /**
     * 检查任务是否满足开始条件（所有依赖已完成）
     */
    canStart(taskId) {
        const task = taskLifecycle.getTask(taskId);
        if (!task)
            return { canStart: false, reasons: ['Task not found'] };
        if (task.status !== 'pending') {
            return { canStart: false, reasons: [`Task is ${task.status}, must be pending`] };
        }
        const reasons = [];
        for (const depId of task.dependsOn) {
            const dep = taskLifecycle.getTask(depId);
            if (!dep) {
                reasons.push(`Dependency ${depId} not found`);
            }
            else if (!['done', 'cancelled'].includes(dep.status)) {
                reasons.push(`Dependency ${depId} is ${dep.status} (must be done or cancelled)`);
            }
        }
        return { canStart: reasons.length === 0, reasons };
    }
    /**
     * 获取可开始的任务列表（按依赖排序）
     */
    getRunnableTasks(sessionId) {
        const tasks = sessionId
            ? taskLifecycle.getTasksBySession(sessionId)
            : taskLifecycle.getAllTasks();
        return tasks
            .filter(t => t.status === 'pending')
            .filter(t => this.canStart(t.taskId).canStart)
            .sort((a, b) => {
            // 优先级的数值排序
            const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
            return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        });
    }
    /**
     * 启动任务（检查依赖后启动）
     */
    async startTask(taskId) {
        const { canStart, reasons } = this.canStart(taskId);
        if (!canStart) {
            throw new Error(`Cannot start task: ${reasons.join('; ')}`);
        }
        return taskLifecycle.transition(taskId, 'running');
    }
    /**
     * 完成子任务时，更新父任务进度
     */
    async onSubtaskCompleted(subtaskId) {
        const allTasks = taskLifecycle.getAllTasks();
        for (const task of allTasks) {
            if (task.subtaskIds.includes(subtaskId)) {
                const completedSubtasks = task.subtaskIds
                    .map(id => taskLifecycle.getTask(id))
                    .filter(t => t && t.status === 'done');
                const totalSubtasks = task.subtaskIds
                    .map(id => taskLifecycle.getTask(id))
                    .filter(t => t).length;
                const progress = totalSubtasks > 0
                    ? Math.round((completedSubtasks.length / totalSubtasks) * 100)
                    : 0;
                taskLifecycle.updateProgress(task.taskId, progress);
                // 如果所有子任务都完成，父任务自动完成
                if (completedSubtasks.length === totalSubtasks && task.status === 'running') {
                    await taskLifecycle.transition(task.taskId, 'done');
                }
            }
        }
    }
    /**
     * 级联取消：当父任务取消时，取消所有子任务和被阻塞任务
     */
    async cascadeCancel(taskId) {
        const cancelled = [taskId];
        const task = taskLifecycle.getTask(taskId);
        if (!task)
            return cancelled;
        // 取消所有子任务
        for (const subtaskId of task.subtaskIds) {
            const subtask = taskLifecycle.getTask(subtaskId);
            if (subtask && ['pending', 'running', 'suspended'].includes(subtask.status)) {
                await taskLifecycle.transition(subtaskId, 'cancelled');
                cancelled.push(subtaskId);
                // 递归取消
                const subCascade = await this.cascadeCancel(subtaskId);
                cancelled.push(...subCascade);
            }
        }
        // 取消所有被阻塞的任务
        for (const blockedId of task.blockingTasks) {
            const blocked = taskLifecycle.getTask(blockedId);
            if (blocked && ['pending'].includes(blocked.status)) {
                await taskLifecycle.transition(blockedId, 'cancelled');
                cancelled.push(blockedId);
            }
        }
        return [...new Set(cancelled)];
    }
    /**
     * 获取任务链（所有祖先和后代）
     */
    getTaskChain(taskId) {
        const ancestors = new Set();
        const descendants = new Set();
        const collectAncestors = (id) => {
            const task = taskLifecycle.getTask(id);
            if (task?.parentTaskId) {
                ancestors.add(task.parentTaskId);
                collectAncestors(task.parentTaskId);
            }
        };
        const collectDescendants = (id) => {
            const task = taskLifecycle.getTask(id);
            if (task) {
                for (const subId of task.subtaskIds) {
                    descendants.add(subId);
                    collectDescendants(subId);
                }
            }
        };
        collectAncestors(taskId);
        collectDescendants(taskId);
        return {
            ancestors: Array.from(ancestors),
            descendants: Array.from(descendants),
        };
    }
}
export const taskFlow = TaskFlowService.getInstance();

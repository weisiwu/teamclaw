/**
 * Task Lifecycle Hooks
 * 任务机制模块 - 任务生命周期钩子
 *
 * 在任务状态变更时自动触发：
 * 1. 任务完成 → autoBump 版本升级
 * 2. 任务完成 → 群聊通知
 */
import { executeAutoBump } from './autoBump.js';
/**
 * 注册任务生命周期钩子
 * 在 taskLifecycle 初始化时调用一次
 */
export function registerTaskLifecycleHooks(taskLifecycle) {
    // 任务完成 → 自动版本升级
    taskLifecycle.onStatusChange(onTaskDoneAutoBump);
    // 任务完成/失败/取消 → 群聊通知
    taskLifecycle.onStatusChange(onTaskDoneNotify);
    // 任务被暂停 → 通知
    taskLifecycle.onStatusChange(onTaskSuspendedNotify);
    console.log('[taskLifecycleHooks] All hooks registered');
}
// ============ 钩子实现 ============
/**
 * 任务完成 → 自动版本升级
 */
async function onTaskDoneAutoBump(task, oldStatus, newStatus) {
    if (newStatus !== 'done')
        return;
    try {
        console.log(`[taskLifecycleHooks] Task ${task.taskId} done, triggering autoBump`);
        // 获取当前版本设置（从全局配置中获取）
        const versionId = task.versionId || 'default';
        // 触发自动版本升级
        await executeAutoBump({
            versionId,
            currentVersion: '0.0.0', // 实际从 versionBump 获取
            triggerType: 'task_done',
            taskId: task.taskId,
            taskTitle: task.title,
            taskType: task.tags?.[0],
        });
    }
    catch (err) {
        // 非关键路径，失败不阻塞主流程
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[taskLifecycleHooks] autoBump failed for task ${task.taskId}:`, msg);
    }
}
/**
 * 任务完成 → 群聊通知
 */
async function onTaskDoneNotify(task, oldStatus, newStatus) {
    if (!['done', 'failed', 'cancelled'].includes(newStatus))
        return;
    const statusText = {
        done: '✅ 已完成',
        failed: '❌ 已失败',
        cancelled: '🚫 已取消',
    };
    const content = [
        `📋 **任务状态变更**`,
        `任务：${task.title}`,
        `状态：${statusText[newStatus] || newStatus}`,
        `执行者：${task.assignedAgent || '未知'}`,
        task.result ? `结果：${task.result}` : '',
    ].filter(Boolean).join('\n');
    try {
        // 向任务的创建者发送通知（通过 channel）
        // 实际生产中需要从 task.contextSnapshot 获取 channel 信息
        console.log(`[taskLifecycleHooks] Notifying for task ${task.taskId}: ${content}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[taskLifecycleHooks] Notification failed for task ${task.taskId}:`, msg);
    }
}
/**
 * 任务被暂停 → 通知
 */
async function onTaskSuspendedNotify(task, oldStatus, newStatus) {
    if (newStatus !== 'suspended')
        return;
    const content = `⏸️ 任务已被暂停：${task.title}`;
    try {
        console.log(`[taskLifecycleHooks] Task suspended: ${task.taskId}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[taskLifecycleHooks] Suspend notification failed:`, msg);
    }
}

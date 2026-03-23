const handlers = [];
let isShuttingDown = false;
/**
 * 注册关闭处理函数（LIFO 顺序执行，先注册的后执行）
 */
export function onShutdown(name, fn) {
    handlers.push({ name, fn });
}
/**
 * 执行所有关闭处理
 */
async function gracefulShutdown(signal) {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    console.log(`\n[shutdown] Received ${signal}, graceful shutdown starting...`);
    // LIFO 顺序：先关应用层，再关基础设施
    const reversed = [...handlers].reverse();
    for (const { name, fn } of reversed) {
        try {
            console.log(`[shutdown] Closing ${name}...`);
            await Promise.race([
                Promise.resolve(fn()),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
            ]);
            console.log(`[shutdown] ${name} closed`);
        }
        catch (err) {
            console.error(`[shutdown] ${name} close error:`, err);
        }
    }
    console.log('[shutdown] All connections closed, exiting');
    process.exit(0);
}
/**
 * 注册进程信号监听（在 index.ts 中调用一次）
 */
export function registerShutdownHandlers() {
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    // 未捕获异常也尝试优雅关闭
    process.on('uncaughtException', (err) => {
        console.error('[shutdown] Uncaught exception:', err);
        gracefulShutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
        console.error('[shutdown] Unhandled rejection:', reason);
        // 不退出，仅记录
    });
}

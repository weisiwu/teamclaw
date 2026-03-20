/**
 * Agent 工作空间管理
 * 负责创建/清理 Agent 独立工作目录
 */
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
const AGENT_BASE_DIR = path.join(os.homedir(), ".openclaw", "agents");
/**
 * 获取 Agent 工作空间信息
 */
export function getWorkspaceInfo(agentName) {
    const agentPath = path.join(AGENT_BASE_DIR, agentName);
    const sessionPath = path.join(agentPath, "sessions");
    const memoryPath = path.join(agentPath, "memory");
    return {
        name: agentName,
        path: agentPath,
        exists: fs.existsSync(agentPath),
        hasSession: fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0,
        hasMemory: fs.existsSync(memoryPath) && fs.readdirSync(memoryPath).length > 0,
    };
}
/**
 * 获取所有 Agent 工作空间信息
 */
export function getAllWorkspaces() {
    const agentNames = ["main", "pm", "reviewer", "coder1", "coder2"];
    return agentNames.map((name) => getWorkspaceInfo(name));
}
/**
 * 检查工作空间是否就绪
 */
export function isWorkspaceReady(agentName) {
    const info = getWorkspaceInfo(agentName);
    return info.exists;
}
/**
 * 获取共享资源路径
 */
export function getSharedResources() {
    return {
        skills: path.join(os.homedir(), ".openclaw", "skills"),
        workspace: path.join(os.homedir(), ".openclaw", "workspace"),
        memory: path.join(os.homedir(), ".openclaw", "memory"),
    };
}
/**
 * 检查共享资源是否就绪
 */
export function areSharedResourcesReady() {
    const res = getSharedResources();
    return {
        skills: fs.existsSync(res.skills),
        workspace: fs.existsSync(res.workspace),
        memory: fs.existsSync(res.memory),
    };
}

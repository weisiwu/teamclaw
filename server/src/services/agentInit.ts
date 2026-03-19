/**
 * Agent 初始化脚本
 * 首次启动时验证 Agent 目录和共享资源配置
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { AGENT_TEAM, getSharedResources } from "../constants/agents.js";

const AGENT_BASE_DIR = path.join(os.homedir(), ".openclaw", "agents");

export interface InitResult {
  success: boolean;
  message: string;
  details: {
    agentDirs: { name: string; created: boolean; error?: string }[];
    sharedResources: { name: string; exists: boolean; writable: boolean }[];
  };
}

/**
 * 执行 Agent 环境初始化检查
 */
export function runAgentInitCheck(): InitResult {
  const agentResults: InitResult["details"]["agentDirs"] = [];
  const sharedResults: InitResult["details"]["sharedResources"] = [];
  let allOk = true;

  // 1. 检查/创建 Agent 目录
  for (const agent of AGENT_TEAM) {
    try {
      const agentDir = path.join(AGENT_BASE_DIR, agent.name);
      const sessionsDir = path.join(agentDir, "sessions");
      const memoryDir = path.join(agentDir, "memory");

      if (!fs.existsSync(agentDir)) {
        fs.mkdirSync(agentDir, { recursive: true });
        fs.mkdirSync(sessionsDir, { recursive: true });
        fs.mkdirSync(memoryDir, { recursive: true });
        agentResults.push({ name: agent.name, created: true });
      } else {
        agentResults.push({ name: agent.name, created: false });
      }
    } catch (e) {
      allOk = false;
      const err = e instanceof Error ? e.message : String(e);
      agentResults.push({ name: agent.name, created: false, error: err });
    }
  }

  // 2. 检查共享资源
  const shared = getSharedResources();
  const sharedNames: { key: keyof typeof shared; label: string }[] = [
    { key: "skills", label: "Skills" },
    { key: "workspace", label: "Workspace" },
    { key: "memory", label: "Memory" },
  ];

  for (const { key, label } of sharedNames) {
    const dir = shared[key];
    const exists = fs.existsSync(dir);
    let writable = false;
    if (exists) {
      try {
        fs.accessSync(dir, fs.constants.W_OK);
        writable = true;
      } catch {
        writable = false;
      }
    }
    if (!exists) allOk = false;
    sharedResults.push({ name: label, exists, writable });
  }

  return {
    success: allOk,
    message: allOk ? "Agent 环境检查完成，所有资源就绪" : "Agent 环境检查完成，部分资源异常",
    details: { agentDirs: agentResults, sharedResources: sharedResults },
  };
}

/**
 * 获取初始化状态摘要（用于健康检查）
 */
export function getInitStatus(): {
  allAgentsReady: boolean;
  sharedResourcesReady: boolean;
  agentCount: number;
  readyCount: number;
} {
  const result = runAgentInitCheck();
  const agentCount = AGENT_TEAM.length;
  const readyCount = result.details.agentDirs.filter((a) => !a.error).length;

  return {
    allAgentsReady: readyCount === agentCount,
    sharedResourcesReady: result.details.sharedResources.every((r) => r.exists && r.writable),
    agentCount,
    readyCount,
  };
}

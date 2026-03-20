/**
 * Agent 编排常量定义
 * 定义系统中的 Agent 团队、等级矩阵、指派规则
 */
import * as path from 'path';
export const AGENT_LEVEL_LABELS = {
    1: "Lv1 - 执行层",
    2: "Lv2 - 策划层",
    3: "Lv3 - 决策层",
};
// ============ 团队成员定义 ============
export const AGENT_TEAM = [
    {
        name: "main",
        role: "主管",
        level: 3,
        description: "任务分配与质量把控，不做具体工作",
        inGroup: true,
        defaultModel: "claude-sonnet-3.5",
        capabilities: ["任务分配", "质量把控", "需求确认", "进度跟踪"],
        workspace: "~/.openclaw/agents/main",
        sessionKey: "agent:main:feishu",
    },
    {
        name: "pm",
        role: "产品经理",
        level: 2,
        description: "需求拆分与细化，收集整理群消息",
        inGroup: true,
        defaultModel: "claude-sonnet-3.5",
        capabilities: ["需求细化", "结构化问答", "需求文档生成", "任务同步"],
        workspace: "~/.openclaw/agents/pm",
        sessionKey: "agent:pm:feishu",
    },
    {
        name: "reviewer",
        role: "代码审查",
        level: 2,
        description: "代码审查，问题发现与修复建议",
        inGroup: false,
        defaultModel: "claude-sonnet-3.5",
        capabilities: ["代码审查", "问题发现", "修复建议", "质量把关"],
        workspace: "~/.openclaw/agents/reviewer",
        sessionKey: "agent:reviewer:feishu",
    },
    {
        name: "coder1",
        role: "程序员1号",
        level: 1,
        description: "代码编写与实现",
        inGroup: false,
        defaultModel: "claude-sonnet-3.5",
        capabilities: ["代码编写", "文件操作", "Git操作", "单元测试"],
        workspace: "~/.openclaw/agents/coder1",
        sessionKey: "agent:coder1:feishu",
    },
    {
        name: "coder2",
        role: "程序员2号",
        level: 1,
        description: "代码编写与实现",
        inGroup: false,
        defaultModel: "claude-sonnet-3.5",
        capabilities: ["代码编写", "文件操作", "Git操作", "单元测试"],
        workspace: "~/.openclaw/agents/coder2",
        sessionKey: "agent:coder2:feishu",
    },
];
// ============ 等级指派矩阵 ============
// 格式: 从谁 -> 到谁 (谁可以指派谁)
export const DISPATCH_MATRIX = {
    main: ["pm", "reviewer", "coder1", "coder2"],
    pm: ["coder1", "coder2"],
    reviewer: ["coder1", "coder2"],
};
// 等级指派规则：高级可指派低级
export function canDispatch(from, to) {
    const allowed = DISPATCH_MATRIX[from];
    if (!allowed)
        return false;
    return allowed.includes(to);
}
// 反向检查：低级不能指派高级
export function isReverseDispatch(from, to) {
    const allowed = DISPATCH_MATRIX[from];
    if (!allowed)
        return true;
    return !allowed.includes(to);
}
// ============ 辅助函数 ============
export function getAgentByName(name) {
    return AGENT_TEAM.find((a) => a.name === name);
}
export function getAgentsByLevel(level) {
    return AGENT_TEAM.filter((a) => a.level === level);
}
export function getSubordinates(name) {
    const allowed = DISPATCH_MATRIX[name] || [];
    return AGENT_TEAM.filter((a) => allowed.includes(a.name));
}
export function getTeamOverview() {
    return [3, 2, 1].map((level) => ({
        level: level,
        agents: getAgentsByLevel(level),
    }));
}
export function getAvailableAgents(level) {
    const agents = level != null ? getAgentsByLevel(level) : AGENT_TEAM;
    // For now all agents are available (extend with status tracking later)
    return agents;
}
export function getSharedResources() {
    const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
    const base = path.join(home, '.openclaw');
    return {
        skills: path.join(base, 'workspace', 'skills'),
        workspace: path.join(base, 'workspace'),
        memory: path.join(base, 'memory'),
    };
}

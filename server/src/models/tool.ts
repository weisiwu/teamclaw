// Tool 类型定义 + 内置 Tool 清单

export type ToolCategory = 'file' | 'git' | 'shell' | 'api' | 'browser' | 'custom';
export type ToolSource = 'builtin' | 'user' | 'imported';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface ToolDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: ToolCategory;
  source: ToolSource;
  enabled: boolean;
  parameters: ToolParameter[];
  outputSchema?: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
}

// 内置 Tools 清单
export const BUILTIN_TOOLS: Omit<ToolDefinition, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'tool.file.read',
    name: 'file.read',
    displayName: '读取文件',
    description: '读取指定路径的文本文件内容',
    category: 'file',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: '文件路径（绝对路径）',
        required: true,
      },
      {
        name: 'offset',
        type: 'number',
        description: '起始行号（1-based，默认为 1）',
        required: false,
        defaultValue: 1,
      },
      {
        name: 'limit',
        type: 'number',
        description: '最大读取行数（默认 2000）',
        required: false,
        defaultValue: 2000,
      },
    ],
    outputSchema: '{ "content": string, "truncated": boolean, "lineCount": number }',
    riskLevel: 'low',
    requiresApproval: false,
    version: '1.0.0',
  },
  {
    id: 'tool.file.write',
    name: 'file.write',
    displayName: '写入文件',
    description: '创建或覆盖指定路径的文本文件',
    category: 'file',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: '文件路径（绝对路径）',
        required: true,
      },
      {
        name: 'content',
        type: 'string',
        description: '文件内容',
        required: true,
      },
    ],
    outputSchema: '{ "path": string, "bytesWritten": number }',
    riskLevel: 'high',
    requiresApproval: true,
    version: '1.0.0',
  },
  {
    id: 'tool.file.edit',
    name: 'file.edit',
    displayName: '编辑文件',
    description: '对文件进行精确的文本替换编辑',
    category: 'file',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: '文件路径（绝对路径）',
        required: true,
      },
      {
        name: 'oldText',
        type: 'string',
        description: '需要替换的原文本（必须精确匹配）',
        required: true,
      },
      {
        name: 'newText',
        type: 'string',
        description: '替换后的新文本',
        required: true,
      },
    ],
    outputSchema: '{ "path": string, "success": boolean }',
    riskLevel: 'high',
    requiresApproval: true,
    version: '1.0.0',
  },
  {
    id: 'tool.git.clone',
    name: 'git.clone',
    displayName: '克隆仓库',
    description: '通过 git clone 克隆远程 Git 仓库到本地',
    category: 'git',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'Git 仓库 URL',
        required: true,
      },
      {
        name: 'branch',
        type: 'string',
        description: '分支名（默认为 main）',
        required: false,
        defaultValue: 'main',
      },
      {
        name: 'targetDir',
        type: 'string',
        description: '目标目录（默认为当前目录）',
        required: false,
      },
    ],
    outputSchema: '{ "path": string, "branch": string }',
    riskLevel: 'medium',
    requiresApproval: true,
    version: '1.0.0',
  },
  {
    id: 'tool.git.commit',
    name: 'git.commit',
    displayName: '提交更改',
    description: '执行 git add . && git commit -m "..."',
    category: 'git',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'message',
        type: 'string',
        description: '提交信息',
        required: true,
      },
      {
        name: 'path',
        type: 'string',
        description: '仓库路径（默认为当前工作区）',
        required: false,
      },
    ],
    outputSchema: '{ "commitHash": string, "message": string }',
    riskLevel: 'medium',
    requiresApproval: true,
    version: '1.0.0',
  },
  {
    id: 'tool.shell.exec',
    name: 'shell.exec',
    displayName: '执行 Shell',
    description: '在本地系统执行 shell 命令',
    category: 'shell',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'command',
        type: 'string',
        description: '要执行的 shell 命令',
        required: true,
      },
      {
        name: 'cwd',
        type: 'string',
        description: '工作目录（默认为当前目录）',
        required: false,
      },
      {
        name: 'timeout',
        type: 'number',
        description: '超时时间（秒，默认 60）',
        required: false,
        defaultValue: 60,
      },
    ],
    outputSchema: '{ "stdout": string, "stderr": string, "exitCode": number }',
    riskLevel: 'high',
    requiresApproval: true,
    version: '1.0.0',
  },
  {
    id: 'tool.shell.batch',
    name: 'shell.batch',
    displayName: '批量执行命令',
    description: '按顺序执行多条 shell 命令',
    category: 'shell',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'commands',
        type: 'array',
        description: '命令列表',
        required: true,
      },
      {
        name: 'cwd',
        type: 'string',
        description: '工作目录',
        required: false,
      },
    ],
    outputSchema: '{ "results": Array<{ "stdout": string, "stderr": string, "exitCode": number }> }',
    riskLevel: 'high',
    requiresApproval: true,
    version: '1.0.0',
  },
  {
    id: 'tool.api.request',
    name: 'api.request',
    displayName: 'HTTP 请求',
    description: '发起 HTTP 请求（GET/POST/PUT/DELETE）',
    category: 'api',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: '请求 URL',
        required: true,
      },
      {
        name: 'method',
        type: 'string',
        description: 'HTTP 方法',
        required: false,
        defaultValue: 'GET',
      },
      {
        name: 'headers',
        type: 'object',
        description: '请求头',
        required: false,
      },
      {
        name: 'body',
        type: 'object',
        description: '请求体（JSON）',
        required: false,
      },
    ],
    outputSchema: '{ "status": number, "headers": object, "body": unknown }',
    riskLevel: 'medium',
    requiresApproval: true,
    version: '1.0.0',
  },
  {
    id: 'tool.browser.open',
    name: 'browser.open',
    displayName: '打开页面',
    description: '在浏览器中打开指定 URL',
    category: 'browser',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: '页面 URL',
        required: true,
      },
      {
        name: 'profile',
        type: 'string',
        description: '浏览器 profile 名称（默认使用默认 profile）',
        required: false,
      },
    ],
    outputSchema: '{ "tabId": string, "url": string }',
    riskLevel: 'low',
    requiresApproval: false,
    version: '1.0.0',
  },
  {
    id: 'tool.browser.screenshot',
    name: 'browser.screenshot',
    displayName: '截图',
    description: '对当前浏览器 Tab 进行截图',
    category: 'browser',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'tabId',
        type: 'string',
        description: 'Tab ID（默认当前活动 Tab）',
        required: false,
      },
      {
        name: 'fullPage',
        type: 'boolean',
        description: '是否截取整个页面（默认 false）',
        required: false,
        defaultValue: false,
      },
    ],
    outputSchema: '{ "imagePath": string, "width": number, "height": number }',
    riskLevel: 'low',
    requiresApproval: false,
    version: '1.0.0',
  },
];

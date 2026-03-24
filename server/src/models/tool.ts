/**
 * Tool 数据模型
 * Agent 可调用的外部工具/API
 */

export type ToolCategory = 'file' | 'git' | 'shell' | 'api' | 'browser' | 'custom';
export type ToolSource = 'builtin' | 'user' | 'imported';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: unknown;
  enum?: unknown[];              // 可选的枚举值
  min?: number;                  // 数值最小值
  max?: number;                  // 数值最大值
  pattern?: string;              // 字符串正则校验
}

export interface ToolDefinition {
  id: string;
  name: string;                  // 英文标识符（如：git_clone）
  displayName: string;           // 显示名称（如：Git Clone）
  description: string;
  category: ToolCategory;
  source: ToolSource;
  enabled: boolean;
  parameters: ToolParameter[];
  outputSchema?: string;         // JSON Schema 描述输出格式
  riskLevel: 'low' | 'medium' | 'high';
  requiresApproval: boolean;     // 是否需要人工审批
  timeout?: number;              // 默认超时（毫秒）
  maxRetries?: number;           // 最大重试次数
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// 数据库表结构映射（snake_case）
export interface ToolRow {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  source: string;
  enabled: number;              // SQLite: 0/1
  parameters: string;           // JSON
  output_schema: string | null;
  risk_level: string;
  requires_approval: number;    // SQLite: 0/1
  timeout: number | null;
  max_retries: number | null;
  version: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Tool 创建参数
export interface CreateToolParams {
  name: string;
  displayName: string;
  description: string;
  category: ToolCategory;
  parameters?: ToolParameter[];
  outputSchema?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  requiresApproval?: boolean;
  timeout?: number;
  maxRetries?: number;
  version?: string;
}

// Tool 更新参数
export interface UpdateToolParams {
  displayName?: string;
  description?: string;
  category?: ToolCategory;
  enabled?: boolean;
  parameters?: ToolParameter[];
  outputSchema?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  requiresApproval?: boolean;
  timeout?: number;
  maxRetries?: number;
  version?: string;
}

// ========== 内置 Tools ==========

export const BUILTIN_TOOLS: ToolDefinition[] = [
  // ===== File 类 Tools =====
  {
    id: 'builtin_file_read',
    name: 'file_read',
    displayName: '文件读取',
    description: '读取指定路径的文件内容',
    category: 'file',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: '文件路径',
        required: true,
      },
      {
        name: 'encoding',
        type: 'string',
        description: '文件编码',
        required: false,
        defaultValue: 'utf-8',
        enum: ['utf-8', 'utf-16', 'latin1', 'base64'],
      },
    ],
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        content: { type: 'string' },
        size: { type: 'number' },
        encoding: { type: 'string' },
      },
    }),
    riskLevel: 'low',
    requiresApproval: false,
    timeout: 5000,
    maxRetries: 0,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'builtin_file_write',
    name: 'file_write',
    displayName: '文件写入',
    description: '写入内容到指定路径的文件',
    category: 'file',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: '文件路径',
        required: true,
      },
      {
        name: 'content',
        type: 'string',
        description: '文件内容',
        required: true,
      },
      {
        name: 'encoding',
        type: 'string',
        description: '文件编码',
        required: false,
        defaultValue: 'utf-8',
      },
    ],
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        bytesWritten: { type: 'number' },
        path: { type: 'string' },
      },
    }),
    riskLevel: 'medium',
    requiresApproval: false,
    timeout: 5000,
    maxRetries: 0,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'builtin_file_list',
    name: 'file_list',
    displayName: '文件列表',
    description: '列出指定目录下的文件和文件夹',
    category: 'file',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: '目录路径',
        required: true,
      },
      {
        name: 'recursive',
        type: 'boolean',
        description: '是否递归列出子目录',
        required: false,
        defaultValue: false,
      },
    ],
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['file', 'directory'] },
              size: { type: 'number' },
              modifiedAt: { type: 'string' },
            },
          },
        },
      },
    }),
    riskLevel: 'low',
    requiresApproval: false,
    timeout: 5000,
    maxRetries: 0,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ===== Git 类 Tools =====
  {
    id: 'builtin_git_clone',
    name: 'git_clone',
    displayName: 'Git 克隆',
    description: '克隆远程 Git 仓库到本地',
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
        description: '分支名称',
        required: false,
        defaultValue: 'main',
      },
      {
        name: 'targetPath',
        type: 'string',
        description: '本地目标路径',
        required: true,
      },
    ],
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        path: { type: 'string' },
        branch: { type: 'string' },
      },
    }),
    riskLevel: 'medium',
    requiresApproval: false,
    timeout: 120000,
    maxRetries: 1,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'builtin_git_status',
    name: 'git_status',
    displayName: 'Git 状态',
    description: '获取 Git 仓库的当前状态',
    category: 'git',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: 'Git 仓库路径',
        required: true,
      },
    ],
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        branch: { type: 'string' },
        ahead: { type: 'number' },
        behind: { type: 'number' },
        modified: { type: 'array', items: { type: 'string' } },
        staged: { type: 'array', items: { type: 'string' } },
        untracked: { type: 'array', items: { type: 'string' } },
      },
    }),
    riskLevel: 'low',
    requiresApproval: false,
    timeout: 10000,
    maxRetries: 0,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'builtin_git_commit',
    name: 'git_commit',
    displayName: 'Git 提交',
    description: '提交 Git 变更',
    category: 'git',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: 'Git 仓库路径',
        required: true,
      },
      {
        name: 'message',
        type: 'string',
        description: '提交信息',
        required: true,
      },
      {
        name: 'files',
        type: 'array',
        description: '要提交的文件列表（空数组表示全部）',
        required: false,
        defaultValue: [],
      },
    ],
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        commitHash: { type: 'string' },
        message: { type: 'string' },
      },
    }),
    riskLevel: 'high',
    requiresApproval: true,
    timeout: 30000,
    maxRetries: 0,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ===== Shell 类 Tools =====
  {
    id: 'builtin_shell_exec',
    name: 'shell_exec',
    displayName: 'Shell 执行',
    description: '执行 Shell 命令',
    category: 'shell',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'command',
        type: 'string',
        description: 'Shell 命令',
        required: true,
      },
      {
        name: 'cwd',
        type: 'string',
        description: '工作目录',
        required: false,
      },
      {
        name: 'env',
        type: 'object',
        description: '环境变量',
        required: false,
        defaultValue: {},
      },
      {
        name: 'timeout',
        type: 'number',
        description: '超时时间（毫秒）',
        required: false,
        defaultValue: 30000,
        min: 1000,
        max: 300000,
      },
    ],
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        stdout: { type: 'string' },
        stderr: { type: 'string' },
        exitCode: { type: 'number' },
      },
    }),
    riskLevel: 'high',
    requiresApproval: true,
    timeout: 30000,
    maxRetries: 0,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ===== API 类 Tools =====
  {
    id: 'builtin_api_call',
    name: 'api_call',
    displayName: 'API 调用',
    description: '发送 HTTP 请求调用外部 API',
    category: 'api',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: 'API URL',
        required: true,
      },
      {
        name: 'method',
        type: 'string',
        description: 'HTTP 方法',
        required: false,
        defaultValue: 'GET',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
      },
      {
        name: 'headers',
        type: 'object',
        description: '请求头',
        required: false,
        defaultValue: {},
      },
      {
        name: 'body',
        type: 'object',
        description: '请求体（用于 POST/PUT/PATCH）',
        required: false,
      },
      {
        name: 'timeout',
        type: 'number',
        description: '超时时间（毫秒）',
        required: false,
        defaultValue: 30000,
      },
    ],
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        status: { type: 'number' },
        statusText: { type: 'string' },
        headers: { type: 'object' },
        data: {},
      },
    }),
    riskLevel: 'medium',
    requiresApproval: false,
    timeout: 30000,
    maxRetries: 2,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // ===== Browser 类 Tools =====
  {
    id: 'builtin_browser_screenshot',
    name: 'browser_screenshot',
    displayName: '浏览器截图',
    description: '截取网页或元素的屏幕截图',
    category: 'browser',
    source: 'builtin',
    enabled: true,
    parameters: [
      {
        name: 'url',
        type: 'string',
        description: '网页 URL',
        required: true,
      },
      {
        name: 'selector',
        type: 'string',
        description: 'CSS 选择器（为空则截取整页）',
        required: false,
      },
      {
        name: 'width',
        type: 'number',
        description: '视口宽度',
        required: false,
        defaultValue: 1280,
      },
      {
        name: 'height',
        type: 'number',
        description: '视口高度',
        required: false,
        defaultValue: 720,
      },
    ],
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        imageData: { type: 'string', description: 'Base64 encoded image' },
        mimeType: { type: 'string' },
      },
    }),
    riskLevel: 'low',
    requiresApproval: false,
    timeout: 60000,
    maxRetries: 1,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * 按类别分组获取 Tools
 */
export function getToolsByCategory(): Record<ToolCategory, ToolDefinition[]> {
  const groups: Record<ToolCategory, ToolDefinition[]> = {
    file: [],
    git: [],
    shell: [],
    api: [],
    browser: [],
    custom: [],
  };

  for (const tool of BUILTIN_TOOLS) {
    groups[tool.category].push(tool);
  }

  return groups;
}

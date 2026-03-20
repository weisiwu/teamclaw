/**
 * Message Router Service
 * 消息路由服务
 * 
 * 功能：
 * - 基于规则的路由（角色/渠道/内容/优先级）
 * - 消息内容过滤（敏感词/广告检测）
 * - 自定义路由规则（可配置）
 */

import { Message } from '../models/message.js';

export type RouteTarget = 'queue' | 'dlq' | 'drop' | 'agent';

export interface RouteRule {
  id: string;
  name: string;
  // 匹配条件
  conditions: {
    channel?: Message['channel'][];
    role?: Message['role'][];
    priorityMin?: number;
    priorityMax?: number;
    contentPatterns?: string[];  // 包含任一关键词
    contentExclude?: string[];   // 排除包含关键词的消息
    userIds?: string[];          // 指定用户白名单
    timeRange?: { start: string; end: string }; // HH:mm-HH:mm
  };
  // 匹配后动作
  action: {
    target: RouteTarget;
    agentType?: Message['role'];  // 当 target=agent 时，指定路由到哪个角色
    reason?: string;
    prepend?: string;            // 在内容前追加文字
    tags?: string[];             // 给消息打标签
  };
  enabled: boolean;
  priority: number;  // 数字越大优先级越高
}

export interface RouteResult {
  routed: boolean;
  target: RouteTarget;
  reason?: string;
  agentType?: Message['role'];
  tags?: string[];
  content?: string;
  matchedRule?: string;
}

export interface FilterResult {
  passed: boolean;
  reason?: string;
  filteredContent?: string;  // 脱敏后的内容
}

class MessageRouterService {
  private static instance: MessageRouterService;

  // 路由规则列表
  private rules: RouteRule[] = [];

  // 敏感词列表
  private sensitiveWords: string[] = [
    'password', 'passwd', 'secret', 'token', 'api_key', 'apikey',
    'private_key', 'credential',
  ];

  // 广告关键词
  private adPatterns: string[] = [
    'http://', 'https://', 'www.', '.com', '.cn',
    '加我微信', '扫一扫', '私信我', '联系我',
  ];

  // 系统关键词（直接路由到特定Agent）
  private systemKeywords: Array<{
    keyword: string;
    agentType: string;
  }> = [
    { keyword: 'bug', agentType: 'coder' },
    { keyword: '错误', agentType: 'coder' },
    { keyword: '崩溃', agentType: 'coder' },
    { keyword: '部署', agentType: 'devops' },
    { keyword: 'deploy', agentType: 'devops' },
    { keyword: '服务器', agentType: 'devops' },
    { keyword: '需求', agentType: 'pm' },
    { keyword: 'prd', agentType: 'pm' },
    { keyword: '设计', agentType: 'architect' },
    { keyword: '架构', agentType: 'architect' },
    { keyword: '领导', agentType: 'boss' },
    { keyword: 'boss', agentType: 'boss' },
  ];

  static getInstance(): MessageRouterService {
    if (!MessageRouterService.instance) {
      MessageRouterService.instance = new MessageRouterService();
    }
    return MessageRouterService.instance;
  }

  constructor() {
    this.initDefaultRules();
  }

  /**
   * 初始化默认路由规则
   */
  private initDefaultRules(): void {
    this.rules = [
      {
        id: 'rule_high_priority_boss',
        name: 'Boss消息优先处理',
        conditions: { role: ['boss'], priorityMin: 80 },
        action: { target: 'queue', reason: 'Boss高优先级消息' },
        enabled: true,
        priority: 100,
      },
      {
        id: 'rule_pm_to_pm',
        name: 'PM消息路由到PM',
        conditions: { role: ['pm'] },
        action: { target: 'queue', agentType: 'pm', reason: 'PM角色消息' },
        enabled: true,
        priority: 90,
      },
      {
        id: 'rule_coder_keywords',
        name: '技术关键词路由到Coder',
        conditions: { contentPatterns: ['bug', '代码', '部署', 'api', '接口', '数据库', 'sql', 'error', 'crash'] },
        action: { target: 'queue', agentType: 'coder', reason: '技术相关关键词' },
        enabled: true,
        priority: 85,
      },
      {
        id: 'rule_system_keywords',
        name: '系统关键词路由',
        conditions: { contentPatterns: ['@coder', '@pm', '@architect', '@devops', '@boss'] },
        action: { target: 'queue', reason: '系统@提及' },
        enabled: true,
        priority: 95,
      },
      {
        id: 'rule_low_priority_drop',
        name: '超低优先级消息过滤',
        conditions: { priorityMax: 1 },
        action: { target: 'drop', reason: '优先级过低' },
        enabled: true,
        priority: 10,
      },
      {
        id: 'rule_sensitive_content',
        name: '敏感内容检测',
        conditions: { contentPatterns: this.sensitiveWords },
        action: { target: 'dlq', reason: '包含敏感信息' },
        enabled: true,
        priority: 99,
      },
    ];
  }

  /**
   * 路由消息
   */
  route(message: Pick<Message, 'channel' | 'userId' | 'role' | 'content' | 'priority'>): RouteResult {
    // 先做内容过滤
    const filterResult = this.filterContent(message.content);
    let content = message.content;

    if (!filterResult.passed) {
      return {
        routed: true,
        target: 'drop',
        reason: filterResult.reason,
        matchedRule: 'content_filter',
      };
    }

    if (filterResult.filteredContent) {
      content = filterResult.filteredContent;
    }

    // 按优先级从高到低遍历规则
    const sortedRules = [...this.rules]
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.matchConditions(message, rule.conditions)) {
        const result: RouteResult = {
          routed: true,
          target: rule.action.target,
          reason: rule.action.reason,
          agentType: rule.action.agentType,
          tags: rule.action.tags,
          content: rule.action.prepend ? `${rule.action.prepend} ${content}` : content,
          matchedRule: rule.id,
        };
        return result;
      }
    }

    // 默认进入队列
    return { routed: false, target: 'queue' };
  }

  /**
   * 内容过滤
   */
  filterContent(content: string): FilterResult {
    if (!content) return { passed: true };

    const lower = content.toLowerCase();

    // 敏感词检测
    for (const word of this.sensitiveWords) {
      if (lower.includes(word)) {
        // 检查是否是误报（上下文中的单词而非真实密钥）
        if (!this.isFalsePositive(content, word)) {
          return {
            passed: false,
            reason: `包含敏感词: ${word}`,
            filteredContent: this.maskSensitive(content, word),
          };
        }
      }
    }

    // 广告链接检测（仅警告，不拦截）
    for (const pattern of this.adPatterns) {
      if (lower.includes(pattern)) {
        // 标记但不拦截
        return {
          passed: true,
          reason: `警告: 可能包含推广内容`,
        };
      }
    }

    return { passed: true };
  }

  /**
   * 误报检测（避免 "password" 出现在正常文本中被拦截）
   */
  private isFalsePositive(content: string, word: string): boolean {
    const lower = content.toLowerCase();
    const idx = lower.indexOf(word);
    if (idx === -1) return true;

    // 检查前后是否是字母数字（连字符、下划线内的不算误报）
    const before = idx > 0 ? content[idx - 1] : ' ';
    const after = idx + word.length < content.length ? content[idx + word.length] : ' ';

    const isWordBoundary = /[a-zA-Z0-9]/.test(before) || /[a-zA-Z0-9]/.test(after);
    return isWordBoundary;
  }

  /**
   * 脱敏
   */
  private maskSensitive(content: string, word: string): string {
    // 用 * 替换敏感词
    const regex = new RegExp(word, 'gi');
    return content.replace(regex, '*'.repeat(word.length));
  }

  /**
   * 匹配条件
   */
  private matchConditions(
    msg: Pick<Message, 'channel' | 'userId' | 'role' | 'content' | 'priority'>,
    conditions: RouteRule['conditions']
  ): boolean {
    // 渠道匹配
    if (conditions.channel && conditions.channel.length > 0) {
      if (!conditions.channel.includes(msg.channel as Message['channel'])) {
        return false;
      }
    }

    // 角色匹配
    if (conditions.role && conditions.role.length > 0) {
      if (!conditions.role.includes(msg.role as Message['role'])) {
        return false;
      }
    }

    // 优先级范围
    if (conditions.priorityMin !== undefined) {
      if (msg.priority < conditions.priorityMin) return false;
    }
    if (conditions.priorityMax !== undefined) {
      if (msg.priority > conditions.priorityMax) return false;
    }

    // 内容包含关键词
    if (conditions.contentPatterns && conditions.contentPatterns.length > 0) {
      const lower = msg.content.toLowerCase();
      const matched = conditions.contentPatterns.some(p => lower.includes(p.toLowerCase()));
      if (!matched) return false;
    }

    // 内容排除关键词
    if (conditions.contentExclude && conditions.contentExclude.length > 0) {
      const lower = msg.content.toLowerCase();
      const excluded = conditions.contentExclude.some(p => lower.includes(p.toLowerCase()));
      if (excluded) return false;
    }

    // 用户白名单
    if (conditions.userIds && conditions.userIds.length > 0) {
      if (!conditions.userIds.includes(msg.userId)) return false;
    }

    // 时间范围
    if (conditions.timeRange) {
      const now = new Date();
      const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const [start, end] = conditions.timeRange.start.split('-');
      if (current < start || current > end) return false;
    }

    return true;
  }

  /**
   * 基于内容关键词自动路由到Agent
   */
  autoRouteToAgent(content: string): Message['role'] | null {
    const lower = content.toLowerCase();
    for (const { keyword, agentType } of this.systemKeywords) {
      if (lower.includes(keyword)) {
        return agentType;
      }
    }
    return null;
  }

  /**
   * 添加/更新路由规则
   */
  upsertRule(rule: RouteRule): void {
    const idx = this.rules.findIndex(r => r.id === rule.id);
    if (idx >= 0) {
      this.rules[idx] = rule;
    } else {
      this.rules.push(rule);
    }
  }

  /**
   * 删除路由规则
   */
  deleteRule(ruleId: string): boolean {
    const idx = this.rules.findIndex(r => r.id === ruleId);
    if (idx >= 0) {
      this.rules.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * 获取所有路由规则
   */
  getRules(): RouteRule[] {
    return [...this.rules].sort((a, b) => b.priority - a.priority);
  }

  /**
   * 切换规则启用状态
   */
  toggleRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) return false;
    rule.enabled = enabled;
    return true;
  }

  /**
   * 获取路由统计
   */
  getRouteStats(): {
    totalRules: number;
    enabledRules: number;
    byTarget: Record<RouteTarget, number>;
  } {
    const byTarget: Record<RouteTarget, number> = { queue: 0, dlq: 0, drop: 0, agent: 0 };
    for (const rule of this.rules) {
      if (rule.enabled) {
        byTarget[rule.action.target]++;
      }
    }
    return {
      totalRules: this.rules.length,
      enabledRules: this.rules.filter(r => r.enabled).length,
      byTarget,
    };
  }
}

export const messageRouterService = MessageRouterService.getInstance();

/**
 * Message Rate Limiter Service
 * 消息流控 - 速率限制服务
 * 
 * 支持：
 * - 按用户/角色/渠道的滑动窗口限流
 * - 全局限流（防止系统过载）
 * - 自适应限流（根据队列积压情况动态调整）
 */

export interface RateLimitConfig {
  // 每时间窗口允许的最大消息数
  maxMessages: number;
  // 时间窗口大小（毫秒）
  windowMs: number;
  // 限流类型
  type: 'user' | 'role' | 'channel' | 'global';
  // 触发的阈值（队列积压多少条时启用自适应限流）
  adaptiveThreshold?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  resetAt: number; // 窗口重置时间戳
  retryAfterMs?: number; // 如果被限流，多少毫秒后重试
}

interface SlidingWindowEntry {
  timestamp: number;
  count: number;
}

class MessageRateLimiterService {
  private static instance: MessageRateLimiterService;

  // 全局限流滑动窗口
  private globalWindow: SlidingWindowEntry[] = [];

  // 按用户的限流记录: userId -> SlidingWindowEntry[]
  private userWindows: Map<string, SlidingWindowEntry[]> = new Map();

  // 按角色的限流记录: role -> SlidingWindowEntry[]
  private roleWindows: Map<string, SlidingWindowEntry[]> = new Map();

  // 按渠道的限流记录: channel -> SlidingWindowEntry[]
  private channelWindows: Map<string, SlidingWindowEntry[]> = new Map();

  // 全局限流配置（默认：每秒100条）
  private globalLimit: RateLimitConfig = {
    maxMessages: 100,
    windowMs: 1000,
    type: 'global',
  };

  // 各维度限流配置
  private limitConfigs: Map<string, RateLimitConfig> = new Map([
    ['user:default', { maxMessages: 10, windowMs: 1000, type: 'user' }],
    ['role:boss', { maxMessages: 50, windowMs: 1000, type: 'role' }],
    ['role:pm', { maxMessages: 30, windowMs: 1000, type: 'role' }],
    ['role:architect', { maxMessages: 30, windowMs: 1000, type: 'role' }],
    ['role:coder', { maxMessages: 20, windowMs: 1000, type: 'role' }],
    ['role:employee', { maxMessages: 10, windowMs: 1000, type: 'role' }],
    ['channel:feishu', { maxMessages: 60, windowMs: 1000, type: 'channel' }],
    ['channel:web', { maxMessages: 40, windowMs: 1000, type: 'channel' }],
    ['channel:wechat', { maxMessages: 40, windowMs: 1000, type: 'channel' }],
  ]);

  static getInstance(): MessageRateLimiterService {
    if (!MessageRateLimiterService.instance) {
      MessageRateLimiterService.instance = new MessageRateLimiterService();
    }
    return MessageRateLimiterService.instance;
  }

  /**
   * 检查是否允许消息通过限流
   */
  check(
    userId: string,
    role: string,
    channel: string,
    queueSize?: number
  ): RateLimitResult {
    const now = Date.now();

    // 1. 检查全局限流
    const globalResult = this.checkSlidingWindow(
      this.globalWindow,
      now,
      this.globalLimit.maxMessages,
      this.globalLimit.windowMs
    );
    if (!globalResult.allowed) return globalResult;

    // 2. 检查用户限流
    const userKey = `user:${userId}`;
    const userConfig = this.limitConfigs.get(userKey) || this.limitConfigs.get('user:default')!;
    const userResult = this.checkSlidingWindow(
      this.getOrCreateWindow(this.userWindows, userId),
      now,
      userConfig.maxMessages,
      userConfig.windowMs
    );
    if (!userResult.allowed) return userResult;

    // 3. 检查角色限流
    const roleKey = `role:${role}`;
    const roleConfig = this.limitConfigs.get(roleKey) || this.limitConfigs.get('user:default')!;
    const roleResult = this.checkSlidingWindow(
      this.getOrCreateWindow(this.roleWindows, role),
      now,
      roleConfig.maxMessages,
      roleConfig.windowMs
    );
    if (!roleResult.allowed) return roleResult;

    // 4. 检查渠道限流
    const channelKey = `channel:${channel}`;
    const channelConfig = this.limitConfigs.get(channelKey);
    let channelResult: RateLimitResult | null = null;
    if (channelConfig) {
      channelResult = this.checkSlidingWindow(
        this.getOrCreateWindow(this.channelWindows, channel),
        now,
        channelConfig.maxMessages,
        channelConfig.windowMs
      );
      if (!channelResult.allowed) return channelResult;
    }

    // 5. 自适应限流（队列积压超过阈值时）
    if (queueSize !== undefined) {
      const adaptiveResult = this.checkAdaptiveLimit(queueSize, now);
      if (!adaptiveResult.allowed) return adaptiveResult;
    }

    // 所有检查通过
    return {
      allowed: true,
      currentCount: this.globalWindow.reduce((s, e) => s + e.count, 0),
      limit: this.globalLimit.maxMessages,
      remaining: Math.max(0, this.globalLimit.maxMessages - this.getWindowCount(this.globalWindow, now, this.globalLimit.windowMs)),
      resetAt: now + this.globalLimit.windowMs,
    };
  }

  /**
   * 滑动窗口检查
   */
  private checkSlidingWindow(
    window: SlidingWindowEntry[],
    now: number,
    limit: number,
    windowMs: number
  ): RateLimitResult {
    // 清理过期窗口
    const cutoff = now - windowMs;
    const validEntries = window.filter(e => e.timestamp > cutoff);

    const currentCount = validEntries.reduce((s, e) => s + e.count, 0);

    if (currentCount >= limit) {
      // 找到最旧的条目的过期时间
      const oldestEntry = validEntries[0];
      const resetAt = oldestEntry ? oldestEntry.timestamp + windowMs : now + windowMs;
      return {
        allowed: false,
        currentCount,
        limit,
        remaining: 0,
        resetAt,
        retryAfterMs: oldestEntry ? Math.max(0, resetAt - now) : windowMs,
      };
    }

    return {
      allowed: true,
      currentCount,
      limit,
      remaining: limit - currentCount,
      resetAt: now + windowMs,
    };
  }

  /**
   * 记录一次消息通过
   */
  record(userId: string, role: string, channel: string): void {
    const now = Date.now();

    // 全局
    this.addToWindow(this.globalWindow, now);

    // 用户
    const userWindow = this.userWindows.get(userId) || [];
    this.addToWindow(userWindow, now);
    this.userWindows.set(userId, userWindow);

    // 角色
    const roleWindow = this.roleWindows.get(role) || [];
    this.addToWindow(roleWindow, now);
    this.roleWindows.set(role, roleWindow);

    // 渠道
    const channelWindow = this.channelWindows.get(channel) || [];
    this.addToWindow(channelWindow, now);
    this.channelWindows.set(channel, channelWindow);
  }

  /**
   * 添加到滑动窗口
   */
  private addToWindow(window: SlidingWindowEntry[], timestamp: number): void {
    // 合并到同一毫秒的条目
    const last = window[window.length - 1];
    if (last && last.timestamp === timestamp) {
      last.count++;
    } else {
      window.push({ timestamp, count: 1 });
    }

    // 清理过期条目（保留多一个窗口大小的历史）
    const cutoff = timestamp - 60000; // 保留最近60秒
    while (window.length > 0 && window[0].timestamp < cutoff) {
      window.shift();
    }
  }

  private getOrCreateWindow(map: Map<string, SlidingWindowEntry[]>, key: string): SlidingWindowEntry[] {
    if (!map.has(key)) {
      map.set(key, []);
    }
    return map.get(key)!;
  }

  private getWindowCount(window: SlidingWindowEntry[], now: number, windowMs: number): number {
    const cutoff = now - windowMs;
    return window
      .filter(e => e.timestamp > cutoff)
      .reduce((s, e) => s + e.count, 0);
  }

  /**
   * 自适应限流检查
   */
  private checkAdaptiveLimit(queueSize: number, now: number): RateLimitResult {
    // 队列积压超过100条时，限流50%；超过200条时，限流80%
    let factor = 1.0;
    if (queueSize > 200) factor = 0.2; // 限流80%
    else if (queueSize > 100) factor = 0.5; // 限流50%

    if (factor >= 1.0) {
      return { allowed: true, currentCount: 0, limit: -1, remaining: -1, resetAt: now };
    }

    const effectiveLimit = Math.floor(this.globalLimit.maxMessages * factor);
    const currentCount = this.getWindowCount(this.globalWindow, now, this.globalLimit.windowMs);

    if (currentCount >= effectiveLimit) {
      return {
        allowed: false,
        currentCount,
        limit: effectiveLimit,
        remaining: 0,
        resetAt: now + this.globalLimit.windowMs,
        retryAfterMs: this.globalLimit.windowMs,
      };
    }

    return { allowed: true, currentCount, limit: effectiveLimit, remaining: effectiveLimit - currentCount, resetAt: now + this.globalLimit.windowMs };
  }

  /**
   * 获取限流统计
   */
  getStats(queueSize?: number): {
    global: { current: number; limit: number; windowMs: number };
    adaptive: { factor: number; effectiveLimit: number; queueSize: number } | null;
    users: number;
    roles: number;
    channels: number;
  } {
    const now = Date.now();
    const globalCurrent = this.getWindowCount(this.globalWindow, now, this.globalLimit.windowMs);
    let adaptive: { factor: number; effectiveLimit: number; queueSize: number } | null = null;

    if (queueSize !== undefined && queueSize > 100) {
      let factor = 1.0;
      if (queueSize > 200) factor = 0.2;
      else if (queueSize > 100) factor = 0.5;
      adaptive = {
        factor,
        effectiveLimit: Math.floor(this.globalLimit.maxMessages * factor),
        queueSize,
      };
    }

    return {
      global: { current: globalCurrent, limit: this.globalLimit.maxMessages, windowMs: this.globalLimit.windowMs },
      adaptive,
      users: this.userWindows.size,
      roles: this.roleWindows.size,
      channels: this.channelWindows.size,
    };
  }

  /**
   * 更新限流配置
   */
  updateConfig(key: string, config: Partial<RateLimitConfig>): void {
    const existing = this.limitConfigs.get(key) || { type: 'user' as const, maxMessages: 10, windowMs: 1000 };
    this.limitConfigs.set(key, { ...existing, ...config });
  }
}

export const messageRateLimiterService = MessageRateLimiterService.getInstance();

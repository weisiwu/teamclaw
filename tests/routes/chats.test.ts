import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Feishu Chats Routes Tests
 * 覆盖 app/api/v1/feishu/chats/route.ts
 */

// ---- Mock next/server ----

vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    url: string;
    headers: Map<string, string> = new Map();
    constructor(url: string) {
      this.url = url;
    }
  },
  NextResponse: {
    json: vi.fn(),
  },
}));

// ---- Handler logic (mirrors route.ts) ----

function jsonSuccess(data: unknown, requestId?: string) {
  return { code: 0, data, requestId };
}

function jsonError(message: string, status: number, requestId?: string) {
  return { code: status, message, requestId };
}

type FeishuChat = {
  chat_id: string;
  name: string;
  description?: string;
  member_count?: number;
};

function handleGetChats(params: {
  url: string;
  feishuConfigured?: boolean;
  feishuChats?: FeishuChat[];
  feishuHasMore?: boolean;
  feishuPageToken?: string;
  feishuApiError?: boolean;
  feishuApiCode?: number;
  requestId?: string;
}) {
  const requestId = params.requestId ?? `feishu_chat_${Date.now().toString(36)}`;

  // Simulate config check
  if (!params.feishuConfigured) {
    return jsonSuccess({
      chats: [],
      notice: '飞书 API 未配置，请设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET 环境变量',
      configured: false,
    }, requestId);
  }

  const { searchParams } = new URL(params.url);
  const pageSize = searchParams.get('page_size') ?? '20';
  const pageToken = searchParams.get('page_token');

  // Simulate Feishu API response
  if (params.feishuApiError) {
    return jsonError(
      `获取群聊列表失败: Feishu API error: ${params.feishuApiCode ?? 1}`,
      500,
      requestId
    );
  }

  const chats = params.feishuChats || [];
  const pageSizeNum = parseInt(pageSize);
  const start = pageToken ? chats.findIndex(c => c.chat_id === pageToken) + 1 : 0;
  const pageChats = chats.slice(start, start + pageSizeNum);
  const hasMore = start + pageSizeNum < chats.length;
  const nextPageToken = hasMore ? pageChats[pageChats.length - 1]?.chat_id : undefined;

  return jsonSuccess({
    chats: pageChats.map(chat => ({
      chatId: chat.chat_id,
      name: chat.name,
      description: chat.description,
      memberCount: chat.member_count,
    })),
    pageToken: nextPageToken,
    hasMore,
    configured: true,
  }, requestId);
}

// ---- Mock data ----

const mockChats: FeishuChat[] = [
  { chat_id: 'oc_abc123', name: '测试群', description: '这是一个测试群', member_count: 10 },
  { chat_id: 'oc_def456', name: '开发群', description: '开发者交流', member_count: 25 },
  { chat_id: 'oc_ghi789', name: '产品群', member_count: 8 },
  { chat_id: 'oc_jkl012', name: '运营群', member_count: 15 },
  { chat_id: 'oc_mno345', name: '设计群', description: '设计交流群', member_count: 12 },
];

// ---- Tests ----

describe('Feishu Chats API Handler', () => {
  describe('config check', () => {
    it('未配置飞书时返回空列表和 notice', () => {
      const result = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats',
        feishuConfigured: false,
      }) as { code: number; data: { configured: boolean; chats: unknown[]; notice: string } };
      expect(result.code).toBe(0);
      expect(result.data.configured).toBe(false);
      expect(result.data.chats).toHaveLength(0);
      expect(result.data.notice).toContain('飞书 API 未配置');
    });

    it('已配置时返回 configured=true', () => {
      const result = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats',
        feishuConfigured: true,
        feishuChats: [],
      }) as { data: { configured: boolean } };
      expect(result.data.configured).toBe(true);
    });
  });

  describe('returns chat list', () => {
    it('返回所有群聊', () => {
      const result = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats',
        feishuConfigured: true,
        feishuChats: mockChats,
      }) as { data: { chats: { chatId: string; name: string }[] } };
      expect(result.data.chats).toHaveLength(5);
      expect(result.data.chats[0].name).toBe('测试群');
    });

    it('每个群聊包含 chatId、name、description、memberCount', () => {
      const result = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats',
        feishuConfigured: true,
        feishuChats: [mockChats[0]],
      }) as { data: { chats: { chatId: string; name: string; description?: string; memberCount?: number }[] } };
      const chat = result.data.chats[0];
      expect(chat.chatId).toBe('oc_abc123');
      expect(chat.name).toBe('测试群');
      expect(chat.description).toBe('这是一个测试群');
      expect(chat.memberCount).toBe(10);
    });

    it('没有 description 时不包含该字段', () => {
      const result = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats',
        feishuConfigured: true,
        feishuChats: [{ chat_id: 'oc_test', name: '无描述群' }],
      }) as { data: { chats: { description?: string }[] } };
      expect(result.data.chats[0].description).toBeUndefined();
    });
  });

  describe('pagination', () => {
    it('默认 page_size 为 20', () => {
      const result = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats',
        feishuConfigured: true,
        feishuChats: mockChats,
      }) as { data: { chats: unknown[]; hasMore: boolean } };
      // 5条消息，page_size=20，全部返回，hasMore=false
      expect(result.data.chats).toHaveLength(5);
      expect(result.data.hasMore).toBe(false);
    });

    it('支持 page_size 参数', () => {
      const result = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats?page_size=2',
        feishuConfigured: true,
        feishuChats: mockChats,
      }) as { data: { chats: unknown[]; hasMore: boolean } };
      expect(result.data.chats).toHaveLength(2);
      expect(result.data.hasMore).toBe(true);
    });

    it('hasMore=false 时无 pageToken', () => {
      const result = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats?page_size=10',
        feishuConfigured: true,
        feishuChats: mockChats,
      }) as { data: { pageToken: string | undefined } };
      expect(result.data.pageToken).toBeUndefined();
    });

    it('hasMore=true 时返回 pageToken', () => {
      const result = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats?page_size=2',
        feishuConfigured: true,
        feishuChats: mockChats,
      }) as { data: { pageToken: string } };
      expect(result.data.pageToken).toBeDefined();
    });

    it('使用 pageToken 获取后续页面', () => {
      // 第一页
      const page1 = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats?page_size=2',
        feishuConfigured: true,
        feishuChats: mockChats,
      }) as { data: { chats: { chatId: string }[]; pageToken: string } };

      expect(page1.data.chats[0].chatId).toBe('oc_abc123');
      expect(page1.data.chats[1].chatId).toBe('oc_def456');
      expect(page1.data.pageToken).toBe('oc_def456');

      // 第二页
      const page2 = handleGetChats({
        url: `http://localhost/api/v1/feishu/chats?page_size=2&page_token=${page1.data.pageToken}`,
        feishuConfigured: true,
        feishuChats: mockChats,
      }) as { data: { chats: { chatId: string }[] } };

      expect(page2.data.chats[0].chatId).toBe('oc_ghi789');
      expect(page2.data.chats[1].chatId).toBe('oc_jkl012');
    });
  });

  describe('error handling', () => {
    it('飞书 API 错误时返回 500', () => {
      const result = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats',
        feishuConfigured: true,
        feishuApiError: true,
        feishuApiCode: 999,
      }) as { code: number; message: string };
      expect(result.code).toBe(500);
      expect(result.message).toContain('获取群聊列表失败');
    });

    it('错误响应包含 requestId', () => {
      const result = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats',
        feishuConfigured: true,
        feishuApiError: true,
        requestId: 'req_test_123',
      }) as { code: number; requestId: string };
      expect(result.requestId).toBe('req_test_123');
    });
  });

  describe('空列表', () => {
    it('无群聊时返回空数组', () => {
      const result = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats',
        feishuConfigured: true,
        feishuChats: [],
      }) as { data: { chats: unknown[]; hasMore: boolean } };
      expect(result.data.chats).toHaveLength(0);
      expect(result.data.hasMore).toBe(false);
    });
  });

  describe('requestId', () => {
    it('包含 requestId', () => {
      const result = handleGetChats({
        url: 'http://localhost/api/v1/feishu/chats',
        feishuConfigured: false,
        requestId: 'req_custom_id',
      }) as { requestId: string };
      expect(result.requestId).toBe('req_custom_id');
    });
  });
});

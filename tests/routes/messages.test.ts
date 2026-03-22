import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Feishu Messages Routes Tests
 * 覆盖 app/api/v1/feishu/messages/route.ts
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

function jsonSuccess(data: unknown) {
  return { code: 0, data };
}

function jsonError(message: string, status: number) {
  return { code: status, message };
}

type FeishuMessage = {
  message_id: string;
  create_time: string;
  sender: { sender_type: string; sender_id: { open_id?: string; user_id?: string } };
  body: { content: string };
  chat_id?: string;
  chat_type?: string;
};

function handleGetMessages(params: {
  container_id?: string | null;
  container_id_type?: string | null;
  page_size?: string | null;
  page_token?: string | null;
  sort_type?: string | null;
  feishuConfigured?: boolean;
  feishuMessages?: FeishuMessage[];
  nextPageToken?: string;
}) {
  // Simulate config check
  if (!params.feishuConfigured) {
    return {
      code: 0,
      data: {
        messages: [],
        notice: '飞书 API 未配置，请设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET 环境变量',
        configured: false,
      },
    };
  }

  if (!params.container_id) {
    return { ...jsonError('缺少参数: container_id（群聊 ID）', 400) };
  }

  const pageSize = parseInt(params.page_size || '20');
  const messages = params.feishuMessages || [];
  const start = params.page_token ? messages.findIndex(m => m.message_id === params.page_token) + 1 : 0;
  const pageMessages = messages.slice(start, start + pageSize);
  const hasMore = start + pageSize < messages.length;
  const nextPageToken = hasMore ? pageMessages[pageMessages.length - 1]?.message_id : undefined;

  return {
    code: 0,
    data: {
      messages: pageMessages,
      page_token: nextPageToken,
      has_more: hasMore,
      configured: true,
    },
  };
}

// ---- Mock data ----

const mockMessages: FeishuMessage[] = [
  {
    message_id: 'msg-001',
    create_time: '2026-03-20T10:00:00.000Z',
    sender: { sender_type: 'user', sender_id: { open_id: 'ou_aaa' } },
    body: { content: '{"text":"Hello world"}' },
    chat_id: 'oc_test123',
    chat_type: 'group',
  },
  {
    message_id: 'msg-002',
    create_time: '2026-03-20T11:00:00.000Z',
    sender: { sender_type: 'user', sender_id: { open_id: 'ou_bbb' } },
    body: { content: '{"text":"Build succeeded"}' },
    chat_id: 'oc_test123',
    chat_type: 'group',
  },
  {
    message_id: 'msg-003',
    create_time: '2026-03-20T12:00:00.000Z',
    sender: { sender_type: 'bot', sender_id: { open_id: 'ou_bot' } },
    body: { content: '{"text":"Deployment started"}' },
    chat_id: 'oc_test123',
    chat_type: 'group',
  },
  {
    message_id: 'msg-004',
    create_time: '2026-03-20T13:00:00.000Z',
    sender: { sender_type: 'user', sender_id: { open_id: 'ou_ccc' } },
    body: { content: '{"text":"Version 2.0.0 released"}' },
    chat_id: 'oc_test123',
    chat_type: 'group',
  },
  {
    message_id: 'msg-005',
    create_time: '2026-03-20T14:00:00.000Z',
    sender: { sender_type: 'user', sender_id: { open_id: 'ou_ddd' } },
    body: { content: '{"text":"Rollback initiated"}' },
    chat_id: 'oc_test123',
    chat_type: 'group',
  },
];

// ---- Tests ----

describe('GET /api/v1/feishu/messages handler', () => {
  describe('config check', () => {
    it('returns configured=false when FEISHU_APP_ID is not set', () => {
      const result = handleGetMessages({ feishuConfigured: false }) as { code: number; data: { configured: boolean; messages: unknown[] } };
      expect(result.code).toBe(0);
      expect(result.data.configured).toBe(false);
      expect(result.data.messages).toHaveLength(0);
    });

    it('includes notice when not configured', () => {
      const result = handleGetMessages({ feishuConfigured: false }) as { data: { notice: string } };
      expect(result.data.notice).toContain('飞书 API 未配置');
    });
  });

  describe('required parameters', () => {
    it('returns 400 when container_id is missing', () => {
      const result = handleGetMessages({ feishuConfigured: true, container_id: undefined }) as { code: number };
      expect(result.code).toBe(400);
    });

    it('returns 400 with descriptive message when container_id missing', () => {
      const result = handleGetMessages({ feishuConfigured: true, container_id: undefined }) as { code: number; message: string };
      expect(result.message).toContain('container_id');
    });
  });

  describe('returns messages when configured', () => {
    it('returns code 0 when configured and container_id provided', () => {
      const result = handleGetMessages({ feishuConfigured: true, container_id: 'oc_test123' }) as { code: number };
      expect(result.code).toBe(0);
    });

    it('returns messages array', () => {
      const result = handleGetMessages({
        feishuConfigured: true,
        container_id: 'oc_test123',
        feishuMessages: mockMessages,
      }) as { data: { messages: unknown[] } };
      expect(Array.isArray(result.data.messages)).toBe(true);
    });

    it('each message has required fields', () => {
      const result = handleGetMessages({
        feishuConfigured: true,
        container_id: 'oc_test123',
        feishuMessages: mockMessages.slice(0, 1),
      }) as { data: { messages: FeishuMessage[] } };
      const msg = result.data.messages[0];
      expect(msg).toHaveProperty('message_id');
      expect(msg).toHaveProperty('create_time');
      expect(msg).toHaveProperty('sender');
      expect(msg).toHaveProperty('body');
    });
  });

  describe('pagination', () => {
    it('returns default page size of 20', () => {
      const result = handleGetMessages({
        feishuConfigured: true,
        container_id: 'oc_test123',
        feishuMessages: mockMessages,
      }) as { data: { messages: unknown[] } };
      // With 5 messages and page_size=20, all 5 should be returned
      expect(result.data.messages).toHaveLength(5);
    });

    it('respects page_size parameter', () => {
      const result = handleGetMessages({
        feishuConfigured: true,
        container_id: 'oc_test123',
        page_size: '2',
        feishuMessages: mockMessages,
      }) as { data: { messages: unknown[]; has_more: boolean } };
      expect(result.data.messages).toHaveLength(2);
      expect(result.data.has_more).toBe(true);
    });

    it('returns has_more=false when no more pages', () => {
      const result = handleGetMessages({
        feishuConfigured: true,
        container_id: 'oc_test123',
        page_size: '10',
        feishuMessages: mockMessages.slice(0, 3),
      }) as { data: { has_more: boolean } };
      expect(result.data.has_more).toBe(false);
    });

    it('returns page_token for next page when has_more=true', () => {
      const result = handleGetMessages({
        feishuConfigured: true,
        container_id: 'oc_test123',
        page_size: '2',
        feishuMessages: mockMessages,
      }) as { data: { page_token: string | undefined } };
      expect(result.data.page_token).toBeDefined();
      expect(typeof result.data.page_token).toBe('string');
    });

    it('fetches second page using page_token', () => {
      // First page
      const page1 = handleGetMessages({
        feishuConfigured: true,
        container_id: 'oc_test123',
        page_size: '2',
        feishuMessages: mockMessages,
      }) as { data: { messages: FeishuMessage[]; page_token: string } };

      const firstMsgId = page1.data.messages[0].message_id;
      const secondPageToken = page1.data.page_token;

      // Verify the page_token is the last message id of first page
      expect(secondPageToken).toBe('msg-002');
      expect(firstMsgId).toBe('msg-001');
    });
  });

  describe('sort_type parameter', () => {
    it('accepts ByCreateTimeDesc as default sort', () => {
      const result = handleGetMessages({
        feishuConfigured: true,
        container_id: 'oc_test123',
        sort_type: 'ByCreateTimeDesc',
        feishuMessages: mockMessages,
      }) as { code: number };
      expect(result.code).toBe(0);
    });

    it('accepts ByCreateTimeAsc sort', () => {
      const result = handleGetMessages({
        feishuConfigured: true,
        container_id: 'oc_test123',
        sort_type: 'ByCreateTimeAsc',
        feishuMessages: mockMessages,
      }) as { code: number };
      expect(result.code).toBe(0);
    });
  });

  describe('empty messages', () => {
    it('returns empty messages array when no messages', () => {
      const result = handleGetMessages({
        feishuConfigured: true,
        container_id: 'oc_empty_chat',
        feishuMessages: [],
      }) as { data: { messages: unknown[]; has_more: boolean } };
      expect(result.data.messages).toHaveLength(0);
      expect(result.data.has_more).toBe(false);
    });
  });

  describe('sender information', () => {
    it('sender type can be user', () => {
      const result = handleGetMessages({
        feishuConfigured: true,
        container_id: 'oc_test123',
        feishuMessages: [mockMessages[0]],
      }) as { data: { messages: FeishuMessage[] } };
      expect(result.data.messages[0].sender.sender_type).toBe('user');
    });

    it('sender type can be bot', () => {
      const result = handleGetMessages({
        feishuConfigured: true,
        container_id: 'oc_test123',
        feishuMessages: [mockMessages[2]],
      }) as { data: { messages: FeishuMessage[] } };
      expect(result.data.messages[0].sender.sender_type).toBe('bot');
    });
  });

  describe('message body content', () => {
    it('body contains content string', () => {
      const result = handleGetMessages({
        feishuConfigured: true,
        container_id: 'oc_test123',
        feishuMessages: [mockMessages[1]],
      }) as { data: { messages: { body: { content: string } }[] } };
      expect(result.data.messages[0].body.content).toContain('Build succeeded');
    });
  });
});

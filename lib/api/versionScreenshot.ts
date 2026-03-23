import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./versionShared";
import { VersionMessageScreenshot, ScreenshotListResponse, LinkScreenshotRequest } from "./types";

// ========== Mock 消息截图数据 ==========
const mockVersionScreenshots: VersionMessageScreenshot[] = [
  {
    id: "ss-1",
    versionId: "v1",
    messageId: "msg-001",
    messageContent: "完成了任务管理模块的开发，新增筛选、排序功能",
    senderName: "张三",
    senderAvatar: undefined,
    screenshotUrl: "https://example.com/screenshots/ss-1.png",
    thumbnailUrl: "https://example.com/screenshots/ss-1-thumb.png",
    createdAt: "2026-01-12T10:00:00Z",
  },
  {
    id: "ss-2",
    versionId: "v1",
    messageId: "msg-002",
    messageContent: "修复了登录页面的样式问题",
    senderName: "李四",
    senderAvatar: undefined,
    screenshotUrl: "https://example.com/screenshots/ss-2.png",
    thumbnailUrl: "https://example.com/screenshots/ss-2-thumb.png",
    createdAt: "2026-01-13T14:30:00Z",
  },
  {
    id: "ss-3",
    versionId: "v2",
    messageId: "msg-003",
    messageContent: "新增 Cron 定时任务管理界面",
    senderName: "王五",
    senderAvatar: undefined,
    screenshotUrl: "https://example.com/screenshots/ss-3.png",
    thumbnailUrl: "https://example.com/screenshots/ss-3-thumb.png",
    createdAt: "2026-02-15T09:00:00Z",
  },
];

// ========== 消息截图 API 函数 ==========

export async function getVersionScreenshots(versionId: string): Promise<ScreenshotListResponse> {
  try {
    const res = await fetch(`${API_BASE}/versions/${versionId}/screenshots`);
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || '获取截图列表失败');
  } catch (err) {
    console.warn('[Screenshot API] Using fallback:', err);
    const filtered = mockVersionScreenshots.filter((s) => s.versionId === versionId);
    return { data: filtered, total: filtered.length };
  }
}

export async function linkScreenshot(
  versionId: string,
  request: LinkScreenshotRequest
): Promise<VersionMessageScreenshot> {
  try {
    const res = await fetch(`${API_BASE}/versions/${versionId}/screenshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || '上传截图失败');
  } catch (err) {
    console.warn('[Screenshot API] Using fallback:', err);
    const newScreenshot: VersionMessageScreenshot = {
      id: `ss-${Date.now()}`,
      versionId,
      messageId: request.messageId,
      messageContent: request.messageContent,
      senderName: request.senderName,
      senderAvatar: request.senderAvatar,
      screenshotUrl: request.screenshotUrl,
      thumbnailUrl: request.thumbnailUrl,
      createdAt: new Date().toISOString(),
    };
    mockVersionScreenshots.unshift(newScreenshot);
    return newScreenshot;
  }
}

export async function unlinkScreenshot(screenshotId: string): Promise<{ success: boolean; versionId?: string }> {
  try {
    const screenshot = mockVersionScreenshots.find((s) => s.id === screenshotId);
    if (!screenshot) return { success: false };

    const res = await fetch(`${API_BASE}/versions/${screenshot.versionId}/screenshots/${screenshotId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      const index = mockVersionScreenshots.findIndex((s) => s.id === screenshotId);
      if (index !== -1) mockVersionScreenshots.splice(index, 1);
      return { success: true, versionId: screenshot.versionId };
    }
    throw new Error(json.message || '删除截图失败');
  } catch (err) {
    console.warn('[Screenshot API] Delete failed, using fallback:', err);
    const screenshot = mockVersionScreenshots.find((s) => s.id === screenshotId);
    const versionId = screenshot?.versionId;
    const index = mockVersionScreenshots.findIndex((s) => s.id === screenshotId);
    if (index === -1) return { success: false };
    mockVersionScreenshots.splice(index, 1);
    return { success: true, versionId };
  }
}

// ========== 消息截图 Hooks ==========

export function useVersionScreenshots(versionId: string) {
  return useQuery({
    queryKey: ["versionScreenshots", versionId],
    queryFn: () => getVersionScreenshots(versionId),
    enabled: !!versionId,
  });
}

export function useLinkScreenshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, request }: { versionId: string; request: LinkScreenshotRequest }) =>
      linkScreenshot(versionId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["versionScreenshots", variables.versionId] });
    },
  });
}

export function useUnlinkScreenshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ screenshotId }: { screenshotId: string; versionId?: string }) =>
      unlinkScreenshot(screenshotId),
    onSuccess: (result) => {
      if (result?.versionId) {
        queryClient.invalidateQueries({ queryKey: ["versionScreenshots", result.versionId] });
      }
    },
  });
}

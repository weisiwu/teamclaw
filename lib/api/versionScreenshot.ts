import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./versionShared";
import { VersionMessageScreenshot, ScreenshotListResponse, LinkScreenshotRequest } from "./types";

// ========== 消息截图 API 函数 ==========

export async function getVersionScreenshots(versionId: string): Promise<ScreenshotListResponse> {
  const res = await fetch(`${API_BASE}/versions/${versionId}/screenshots`);
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '获取截图列表失败');
}

export async function linkScreenshot(
  versionId: string,
  request: LinkScreenshotRequest
): Promise<VersionMessageScreenshot> {
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
}

export async function unlinkScreenshot(screenshotId: string): Promise<{ success: boolean; versionId?: string }> {
  const res = await fetch(`${API_BASE}/versions/screenshot/${screenshotId}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return { success: true, versionId: json.data?.versionId };
  }
  throw new Error(json.message || '删除截图失败');
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

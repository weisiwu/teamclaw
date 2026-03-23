import { useQuery } from "@tanstack/react-query";
import { TagListResponse } from "./types";

const API_BASE = "/api/v1";

export async function getTags(): Promise<TagListResponse> {
  const res = await fetch(`${API_BASE}/tags`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取标签列表失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '获取标签列表失败');
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: getTags,
    staleTime: 1000 * 60 * 5,
  });
}

import { useQuery } from "@tanstack/react-query";
import { GitTag, TagListResponse } from "./types";

const API_BASE = "/api/v1";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock data
const mockTags: GitTag[] = [
  {
    name: "v2.1.0",
    version: "v2.1.0",
    commit: "a3f8d2c",
    commitHash: "a3f8d2c1b4e5f6789012345678901234567890ab",
    subject: "feat: add member management module",
    author: "张三",
    authorEmail: "zhangsan@example.com",
    taggerDate: "2026-03-15T10:30:00Z",
    projectName: "teamclaw",
    status: "active",
    buildStatus: "success",
    hasScreenshot: true,
    hasChangelog: true,
  },
  {
    name: "v2.0.0",
    version: "v2.0.0",
    commit: "b7c1d3e",
    commitHash: "b7c1d3e4f5a6b789012345678901234567890cd",
    subject: "feat: release major version with new UI",
    author: "李四",
    authorEmail: "lisi@example.com",
    taggerDate: "2026-03-01T09:00:00Z",
    projectName: "teamclaw",
    status: "active",
    buildStatus: "success",
    hasScreenshot: true,
    hasChangelog: false,
  },
  {
    name: "v1.5.0",
    version: "v1.5.0",
    commit: "c2d4e5f",
    commitHash: "c2d4e5f6a7b8901234567890123456789012de",
    subject: "fix: resolve token calculation bug",
    author: "王五",
    authorEmail: "wangwu@example.com",
    taggerDate: "2026-02-20T14:20:00Z",
    projectName: "teamclaw",
    status: "active",
    buildStatus: "failed",
    hasScreenshot: false,
    hasChangelog: true,
  },
  {
    name: "v1.4.0",
    version: "v1.4.0",
    commit: "d3e6f7a",
    commitHash: "d3e6f7a8b9c0012345678901234567890123ef",
    subject: "feat: add download statistics panel",
    author: "张三",
    authorEmail: "zhangsan@example.com",
    taggerDate: "2026-02-10T11:00:00Z",
    projectName: "teamclaw",
    status: "archived",
    buildStatus: "success",
    hasScreenshot: false,
    hasChangelog: false,
  },
  {
    name: "v1.3.0",
    version: "v1.3.0",
    commit: "e4f7a8b",
    commitHash: "e4f7a8b9c0d1234567890123456789012345fa",
    subject: "feat: add build notification settings",
    author: "李四",
    authorEmail: "lisi@example.com",
    taggerDate: "2026-01-28T16:45:00Z",
    projectName: "teamclaw",
    status: "active",
    buildStatus: "building",
    hasScreenshot: true,
    hasChangelog: false,
  },
  {
    name: "v1.2.0",
    version: "v1.2.0",
    commit: "f5a8b9c",
    commitHash: "f5a8b9c0d1e234567890123456789012345678fb",
    subject: "feat: add cron task management",
    author: "王五",
    authorEmail: "wangwu@example.com",
    taggerDate: "2026-01-15T08:30:00Z",
    projectName: "teamclaw",
    status: "archived",
    buildStatus: "failed",
    hasScreenshot: false,
    hasChangelog: false,
  },
  {
    name: "v1.1.0",
    version: "v1.1.0",
    commit: "a6b9c0d",
    commitHash: "a6b9c0d1e2f34567890123456789012345678ac",
    subject: "feat: add task filtering and sorting",
    author: "张三",
    authorEmail: "zhangsan@example.com",
    taggerDate: "2026-01-05T10:00:00Z",
    projectName: "teamclaw",
    status: "active",
    buildStatus: "success",
    hasScreenshot: true,
    hasChangelog: true,
  },
  {
    name: "v1.0.0",
    version: "v1.0.0",
    commit: "b7c0d1e",
    commitHash: "b7c0d1e2f3a4567890123456789012345678bd",
    subject: "Initial release of teamclaw platform",
    author: "李四",
    authorEmail: "lisi@example.com",
    taggerDate: "2025-12-20T09:00:00Z",
    projectName: "teamclaw",
    status: "protected",
    buildStatus: "success",
    hasScreenshot: false,
    hasChangelog: true,
  },
];

export async function getTags(): Promise<TagListResponse> {
  try {
    const res = await fetch(`${API_BASE}/tags`);
    const json = await res.json();
    if (json.code === 200 || json.code === 0) {
      return json.data;
    }
    throw new Error(json.message || "Failed to fetch tags");
  } catch {
    await delay(400);
    return {
      data: mockTags,
      total: mockTags.length,
    };
  }
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: getTags,
    staleTime: 1000 * 60 * 5,
  });
}

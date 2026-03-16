import { Version, VersionListResponse, CreateVersionRequest, UpdateVersionRequest } from "./types";

// Mock 数据
const mockVersions: Version[] = [
  {
    id: "v1",
    version: "v1.0.0",
    title: "初始版本",
    description: "团队协作平台初始版本，包含核心功能",
    status: "published",
    releasedAt: "2026-01-15T10:00:00Z",
    createdAt: "2026-01-10T08:00:00Z",
    changedFiles: ["app/layout.tsx", "app/page.tsx", "lib/api/tasks.ts"],
    commitCount: 12,
  },
  {
    id: "v2",
    version: "v1.1.0",
    title: "任务管理增强",
    description: "新增任务筛选、排序、详情页等功能",
    status: "published",
    releasedAt: "2026-02-01T14:30:00Z",
    createdAt: "2026-01-25T09:00:00Z",
    changedFiles: ["app/tasks/page.tsx", "lib/api/tasks.ts", "components/TaskCard.tsx"],
    commitCount: 8,
  },
  {
    id: "v3",
    version: "v1.2.0",
    title: "定时任务支持",
    description: "新增 Cron 定时任务管理功能",
    status: "published",
    releasedAt: "2026-02-20T16:00:00Z",
    createdAt: "2026-02-10T11:00:00Z",
    changedFiles: ["app/cron/page.tsx", "lib/api/cron.ts", "components/CronModal.tsx"],
    commitCount: 6,
  },
  {
    id: "v4",
    version: "v1.3.0",
    title: "Token 统计",
    description: "新增 Token 消耗统计和趋势分析",
    status: "published",
    releasedAt: "2026-03-01T10:00:00Z",
    createdAt: "2026-02-25T08:00:00Z",
    changedFiles: ["app/tokens/page.tsx", "lib/api/tokens.ts"],
    commitCount: 5,
  },
  {
    id: "v5",
    version: "v2.0.0-beta",
    title: "成员管理 & 权限",
    description: "新增成员管理、角色权限系统（测试版）",
    status: "draft",
    releasedAt: null,
    createdAt: "2026-03-15T09:00:00Z",
    changedFiles: ["app/members/page.tsx", "lib/api/members.ts"],
    commitCount: 3,
  },
];

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 版本列表
export async function getVersions(
  page: number = 1,
  pageSize: number = 10,
  status: string = "all"
): Promise<VersionListResponse> {
  await delay(300);

  let filtered = [...mockVersions];
  if (status !== "all") {
    filtered = filtered.filter((v) => v.status === status);
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
  };
}

// 获取单个版本
export async function getVersion(id: string): Promise<Version | null> {
  await delay(200);
  return mockVersions.find((v) => v.id === id) || null;
}

// 创建版本
export async function createVersion(request: CreateVersionRequest): Promise<Version> {
  await delay(300);

  const newVersion: Version = {
    id: `v${Date.now()}`,
    version: request.version,
    title: request.title,
    description: request.description,
    status: request.status,
    releasedAt: request.status === "published" ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
    changedFiles: [],
    commitCount: 0,
  };

  mockVersions.unshift(newVersion);
  return newVersion;
}

// 更新版本
export async function updateVersion(
  id: string,
  request: UpdateVersionRequest
): Promise<Version | null> {
  await delay(300);

  const index = mockVersions.findIndex((v) => v.id === id);
  if (index === -1) return null;

  const updated = {
    ...mockVersions[index],
    ...request,
    releasedAt:
      request.status === "published" && !mockVersions[index].releasedAt
        ? new Date().toISOString()
        : mockVersions[index].releasedAt,
  };

  mockVersions[index] = updated;
  return updated;
}

// 删除版本
export async function deleteVersion(id: string): Promise<boolean> {
  await delay(200);

  const index = mockVersions.findIndex((v) => v.id === id);
  if (index === -1) return false;

  mockVersions.splice(index, 1);
  return true;
}

// React Query hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useVersions(page: number = 1, pageSize: number = 10, status: string = "all") {
  return useQuery({
    queryKey: ["versions", page, pageSize, status],
    queryFn: () => getVersions(page, pageSize, status),
  });
}

export function useVersion(id: string) {
  return useQuery({
    queryKey: ["version", id],
    queryFn: () => getVersion(id),
    enabled: !!id,
  });
}

export function useCreateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useUpdateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateVersionRequest }) =>
      updateVersion(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

export function useDeleteVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions"] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from './versionShared';
import {
  Version,
  VersionListResponse,
  CreateVersionRequest,
  UpdateVersionRequest,
  VersionTag,
  CreateTagRequest,
  CreateTagResponse,
  DownloadUrlVerification,
  GitBranch,
} from './types';

// ========== Version CRUD API ==========

export async function getVersions(
  page: number = 1,
  pageSize: number = 10,
  status: string = 'all'
): Promise<VersionListResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status !== 'all') params.set('status', status);
  const res = await fetch(`${API_BASE}/versions?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取版本列表失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '获取版本列表失败');
}

export async function getVersion(id: string): Promise<Version | null> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取版本详情失败 (${res.status})`);
  }
  const json = await res.json();
  if ((json.code === 200 || json.code === 0) && json.data) {
    return json.data;
  }
  return null;
}

export async function createVersion(request: CreateVersionRequest): Promise<Version> {
  const res = await fetch(`${API_BASE}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `创建版本失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '创建版本失败');
}

export async function updateVersion(
  id: string,
  request: UpdateVersionRequest
): Promise<Version | null> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `更新版本失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '更新版本失败');
}

export async function deleteVersion(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `删除版本失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return true;
  }
  throw new Error(json.message || '删除版本失败');
}

// ========== Tag 管理 API ==========

export async function addVersionTag(versionId: string, tag: VersionTag): Promise<Version | null> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `添加版本标签失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '添加版本标签失败');
}

export async function removeVersionTag(
  versionId: string,
  tag: VersionTag
): Promise<Version | null> {
  const res = await fetch(
    `${API_BASE}/versions/${encodeURIComponent(versionId)}/tags/${encodeURIComponent(tag)}`,
    {
      method: 'DELETE',
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `移除版本标签失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '移除版本标签失败');
}

export async function setMainVersion(versionId: string): Promise<Version | null> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/main`, {
    method: 'PUT',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `设置主版本失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '设置主版本失败');
}

// ========== 手动创建 Git Tag ==========

export async function createGitTag(
  versionId: string,
  request?: CreateTagRequest
): Promise<CreateTagResponse> {
  const res = await fetch(`${API_BASE}/versions/${encodeURIComponent(versionId)}/git-tag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request || {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `创建 Git Tag 失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '创建 Git Tag 失败');
}

// ========== 产物验证 API ==========

export async function verifyDownloadUrl(
  versionId: string,
  url: string
): Promise<DownloadUrlVerification> {
  const res = await fetch(
    `${API_BASE}/versions/${encodeURIComponent(versionId)}/verify-url?url=${encodeURIComponent(url)}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `验证下载链接失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '验证下载链接失败');
}

// ========== 分支创建 API（内部使用）==========

export async function createBranchAPI(branchName: string, versionId?: string): Promise<GitBranch> {
  const res = await fetch(`${API_BASE}/branches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: branchName, versionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `创建分支失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0 || json.code === 201) {
    return json.data;
  }
  throw new Error(json.message || '创建分支失败');
}

// ========== React Query Hooks ==========

export function useVersions(page: number = 1, pageSize: number = 10, status: string = 'all') {
  return useQuery({
    queryKey: ['versions', page, pageSize, status],
    queryFn: () => getVersions(page, pageSize, status),
  });
}

export function useVersion(id: string) {
  return useQuery({
    queryKey: ['version', id],
    queryFn: () => getVersion(id),
    enabled: !!id,
  });
}

export function useCreateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
    },
  });
}

export function useUpdateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateVersionRequest }) =>
      updateVersion(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
    },
  });
}

export function useDeleteVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
    },
  });
}

export function useSetMainVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setMainVersion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
    },
  });
}

export function useAddVersionTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, tag }: { versionId: string; tag: VersionTag }) =>
      addVersionTag(versionId, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
    },
  });
}

export function useRemoveVersionTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, tag }: { versionId: string; tag: VersionTag }) =>
      removeVersionTag(versionId, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
    },
  });
}

export function useCreateGitTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, request }: { versionId: string; request?: CreateTagRequest }) =>
      createGitTag(versionId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
    },
  });
}

export function useCreateBranchForVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ versionId, branchName }: { versionId: string; branchName: string }) =>
      createBranchAPI(branchName, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
    },
  });
}

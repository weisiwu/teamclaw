import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  GitBranch,
  CreateBranchRequest,
  RenameBranchRequest,
  BranchProtectionRequest,
  BranchListResponse,
} from './types';

const API_BASE = '/api/v1';

// ========== API Functions ==========

// 获取所有分支
export async function getBranchesAPI(): Promise<BranchListResponse> {
  const res = await fetch(`${API_BASE}/branches`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取分支列表失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '获取分支列表失败');
}

// 获取分支统计
export async function getBranchStatsAPI(): Promise<{
  total: number;
  main: number;
  protected: number;
  remote: number;
}> {
  const res = await fetch(`${API_BASE}/branches/stats`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取分支统计失败 (${res.status})`);
  }
  const json = await res.json();
  if (json.code === 200 || json.code === 0) {
    return json.data;
  }
  throw new Error(json.message || '获取分支统计失败');
}

// 获取主分支
export async function getMainBranchAPI(): Promise<GitBranch | null> {
  const res = await fetch(`${API_BASE}/branches/main`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取主分支失败 (${res.status})`);
  }
  const json = await res.json();
  if ((json.code === 200 || json.code === 0) && json.data) {
    return json.data;
  }
  return null;
}

// 获取单个分支
export async function getBranchAPI(id: string): Promise<GitBranch | null> {
  const res = await fetch(`${API_BASE}/branches/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `获取分支详情失败 (${res.status})`);
  }
  const json = await res.json();
  if ((json.code === 200 || json.code === 0) && json.data) {
    return json.data;
  }
  return null;
}

// 创建分支
export async function createBranchAPI(request: CreateBranchRequest): Promise<GitBranch> {
  const res = await fetch(`${API_BASE}/branches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const json = await res.json();
  if (!res.ok || (json.code !== 200 && json.code !== 0 && json.code !== 201)) {
    throw new Error(json.message || '创建分支失败');
  }
  return json.data;
}

// 删除分支
export async function deleteBranchAPI(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/branches/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!res.ok || (json.code !== 200 && json.code !== 0)) {
    throw new Error(json.message || '删除分支失败');
  }
  return true;
}

// 设置主分支
export async function setMainBranchAPI(id: string): Promise<GitBranch> {
  const res = await fetch(`${API_BASE}/branches/${encodeURIComponent(id)}/main`, {
    method: 'PUT',
  });
  const json = await res.json();
  if (!res.ok || (json.code !== 200 && json.code !== 0)) {
    throw new Error(json.message || '设置主分支失败');
  }
  return json.data;
}

// 重命名分支
export async function renameBranchAPI(request: RenameBranchRequest): Promise<GitBranch> {
  const res = await fetch(`${API_BASE}/branches/${encodeURIComponent(request.branchId)}/rename`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newName: request.newName }),
  });
  const json = await res.json();
  if (!res.ok || (json.code !== 200 && json.code !== 0)) {
    throw new Error(json.message || '重命名分支失败');
  }
  return json.data;
}

// 设置分支保护
export async function setBranchProtectionAPI(request: BranchProtectionRequest): Promise<GitBranch> {
  const res = await fetch(`${API_BASE}/branches/${encodeURIComponent(request.branchId)}/protect`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ protected: request.protected }),
  });
  const json = await res.json();
  if (!res.ok || (json.code !== 200 && json.code !== 0)) {
    throw new Error(json.message || '设置分支保护失败');
  }
  return json.data;
}

// 检出（切换到）分支
export async function checkoutBranchAPI(id: string): Promise<GitBranch> {
  const res = await fetch(`${API_BASE}/branches/${encodeURIComponent(id)}/checkout`, {
    method: 'PUT',
  });
  const json = await res.json();
  if (!res.ok || (json.code !== 200 && json.code !== 0)) {
    throw new Error(json.message || '检出分支失败');
  }
  return json.data;
}

// ========== React Query Hooks ==========

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: getBranchesAPI,
    staleTime: 30 * 1000,
  });
}

export function useBranchStats() {
  return useQuery({
    queryKey: ['branchStats'],
    queryFn: getBranchStatsAPI,
    staleTime: 60 * 1000,
  });
}

export function useMainBranch() {
  return useQuery({
    queryKey: ['mainBranch'],
    queryFn: getMainBranchAPI,
    staleTime: 30 * 1000,
  });
}

export function useBranch(id: string) {
  return useQuery({
    queryKey: ['branch', id],
    queryFn: () => getBranchAPI(id),
    enabled: !!id,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateBranchRequest) => createBranchAPI(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['branchStats'] });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBranchAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['branchStats'] });
    },
  });
}

export function useSetMainBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => setMainBranchAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['mainBranch'] });
      queryClient.invalidateQueries({ queryKey: ['branchStats'] });
    },
  });
}

export function useRenameBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: RenameBranchRequest) => renameBranchAPI(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useSetBranchProtection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: BranchProtectionRequest) => setBranchProtectionAPI(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['branchStats'] });
    },
  });
}

export function useCheckoutBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => checkoutBranchAPI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['currentBranch'] });
    },
  });
}

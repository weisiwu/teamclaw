// hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProjects,
  fetchProject,
  fetchProjectTree,
  importProject,
  fetchImportStatus,
  deleteProject,
} from '../lib/api/projects';

// 项目列表
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    refetchInterval: 30000,
  });
}

// 项目详情
export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
    enabled: !!id,
  });
}

// 项目文件树
export function useProjectTree(id: string) {
  return useQuery({
    queryKey: ['project-tree', id],
    queryFn: () => fetchProjectTree(id),
    enabled: !!id,
  });
}

// 导入项目
export function useImportProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: importProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// 导入进度
export function useImportStatus(taskId: string) {
  return useQuery({
    queryKey: ['import-status', taskId],
    queryFn: () => fetchImportStatus(taskId),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const task = query.state.data?.task;
      if (!task || task.status === 'done' || task.status === 'error') return false;
      return 3000; // 每 3 秒轮询
    },
  });
}

// 删除项目
export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

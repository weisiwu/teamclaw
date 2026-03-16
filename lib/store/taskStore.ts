import { create } from "zustand";
import { Task } from "@/lib/api/types";

interface TaskState {
  // 选中的任务（用于详情弹窗）
  selectedTask: Task | null;
  isDetailModalOpen: boolean;
  
  // 创建任务弹窗
  isCreateModalOpen: boolean;
  
  // Actions
  setSelectedTask: (task: Task | null) => void;
  openDetailModal: (task: Task) => void;
  closeDetailModal: () => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  selectedTask: null,
  isDetailModalOpen: false,
  isCreateModalOpen: false,

  setSelectedTask: (task) => set({ selectedTask: task }),
  
  openDetailModal: (task) => set({ selectedTask: task, isDetailModalOpen: true }),
  
  closeDetailModal: () => set({ selectedTask: null, isDetailModalOpen: false }),
  
  openCreateModal: () => set({ isCreateModalOpen: true }),
  
  closeCreateModal: () => set({ isCreateModalOpen: false }),
}));

export default useTaskStore;

import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore } from '@/lib/store/taskStore';
import type { Task } from '@/lib/api/types';

const mockTask: Task = {
  id: 'test-1',
  title: 'Test Task',
  description: 'A test task',
  status: 'pending',
  priority: 5,
  creator: 'test-user',
  createdAt: '2026-03-21T00:00:00Z',
  completedAt: null,
  duration: null,
  changes: '',
  changedFiles: [],
  commits: [],
  agents: [],
  tokenCost: 0,
  tags: [],
};

describe('taskStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTaskStore.setState({
      selectedTask: null,
      isDetailModalOpen: false,
      isCreateModalOpen: false,
    });
  });

  describe('initial state', () => {
    it('has null selectedTask by default', () => {
      expect(useTaskStore.getState().selectedTask).toBeNull();
    });

    it('has detail modal closed by default', () => {
      expect(useTaskStore.getState().isDetailModalOpen).toBe(false);
    });

    it('has create modal closed by default', () => {
      expect(useTaskStore.getState().isCreateModalOpen).toBe(false);
    });
  });

  describe('setSelectedTask', () => {
    it('sets the selected task', () => {
      useTaskStore.getState().setSelectedTask(mockTask);
      expect(useTaskStore.getState().selectedTask).toEqual(mockTask);
    });

    it('can set selectedTask to null', () => {
      useTaskStore.setState({ selectedTask: mockTask });
      useTaskStore.getState().setSelectedTask(null);
      expect(useTaskStore.getState().selectedTask).toBeNull();
    });
  });

  describe('openDetailModal / closeDetailModal', () => {
    it('opens detail modal and sets selected task', () => {
      useTaskStore.getState().openDetailModal(mockTask);
      const state = useTaskStore.getState();
      expect(state.isDetailModalOpen).toBe(true);
      expect(state.selectedTask).toEqual(mockTask);
    });

    it('closes detail modal and clears selected task', () => {
      useTaskStore.setState({ selectedTask: mockTask, isDetailModalOpen: true });
      useTaskStore.getState().closeDetailModal();
      const state = useTaskStore.getState();
      expect(state.isDetailModalOpen).toBe(false);
      expect(state.selectedTask).toBeNull();
    });
  });

  describe('openCreateModal / closeCreateModal', () => {
    it('opens create modal', () => {
      useTaskStore.getState().openCreateModal();
      expect(useTaskStore.getState().isCreateModalOpen).toBe(true);
    });

    it('closes create modal', () => {
      useTaskStore.setState({ isCreateModalOpen: true });
      useTaskStore.getState().closeCreateModal();
      expect(useTaskStore.getState().isCreateModalOpen).toBe(false);
    });
  });

  describe('modals are independent', () => {
    it('opening create modal does not affect detail modal', () => {
      useTaskStore.setState({ isDetailModalOpen: true, selectedTask: mockTask });
      useTaskStore.getState().openCreateModal();
      expect(useTaskStore.getState().isCreateModalOpen).toBe(true);
      expect(useTaskStore.getState().isDetailModalOpen).toBe(true);
      expect(useTaskStore.getState().selectedTask).toEqual(mockTask);
    });

    it('closing detail modal does not affect create modal', () => {
      useTaskStore.setState({ isCreateModalOpen: true });
      useTaskStore.getState().closeDetailModal();
      expect(useTaskStore.getState().isCreateModalOpen).toBe(true);
    });
  });
});

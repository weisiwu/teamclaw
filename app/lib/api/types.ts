// ========== Task Types ==========

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  creator: string;
  createdAt: string;
  completedAt?: string | null;
  duration?: number | null;
  changes?: string;
  changedFiles?: string[];
  commits?: string[];
  agents?: string[];
  tokenCost?: number;
  tags?: string[];
  // Extended fields
  sessionId?: string;
  assignedAgent?: string;
  result?: string;
  progress?: number;
  startedAt?: string;
}

export interface TaskFilters {
  search?: string;
  status?: TaskStatus | 'all';
  priority?: string | 'all';
  page?: number;
  pageSize?: number;
}

export interface TaskListResponse {
  data: Task[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  tags?: string[];
  agents?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  agents?: string[];
  result?: string;
  progress?: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  content: string;
  author: string;
  createdAt: string;
}

// ========== Tool Types ==========

export interface Tool {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ========== Skill Types ==========

export interface Skill {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ========== Version Types ==========

export interface Version {
  id: string;
  version: string;
  status: string;
  changelog?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== Common API Response ==========

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

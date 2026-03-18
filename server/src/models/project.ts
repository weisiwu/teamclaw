export type ProjectSource = 'url' | 'local';
export type ProjectStatus = 'active' | 'archived';
export type ImportStatus = 'pending' | 'processing' | 'done' | 'error';
export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export interface Project {
  id: string;
  name: string;
  source: ProjectSource;
  url?: string;
  localPath?: string;
  techStack: string[];
  buildTool?: string;
  hasGit: boolean;
  importedAt: string;
  status: ProjectStatus;
}

export interface ImportStep {
  step: number;
  name: string;
  status: StepStatus;
  error?: string;
}

export interface ImportTask {
  taskId: string;
  projectId: string;
  status: ImportStatus;
  currentStep: number;
  totalSteps: number;
  steps: ImportStep[];
  startedAt?: string;
  completedAt?: string;
}

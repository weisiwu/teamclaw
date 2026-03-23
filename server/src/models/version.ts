export type VersionBumpType = 'patch' | 'minor' | 'major';

export interface Version {
  id: string;
  version: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  gitTag?: string;
  gitTagCreatedAt?: string;
  buildStatus: 'pending' | 'building' | 'success' | 'failed';
  artifactUrl?: string;
  releasedAt?: string;
  createdAt: string;
  updatedAt: string;
  isMain: boolean;
  commitCount: number;
  changedFiles: string[];
  hasScreenshot?: boolean;
  hasSummary?: boolean;
  summary?: string;
  summaryGeneratedAt?: string;
  summaryGeneratedBy?: string;
}

export interface VersionSettings {
  autoBump: boolean;
  bumpType: VersionBumpType;
  autoTag: boolean;
  tagPrefix: 'v' | 'release' | 'version' | 'custom';
  customPrefix?: string;
  tagOnStatus: string[];
  lastBumpedAt?: string;
}

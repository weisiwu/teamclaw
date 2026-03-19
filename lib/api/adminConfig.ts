export interface LLMConfig {
  defaultModel: string;
  temperature: number;
  maxTokens: number;
}

export interface FeatureFlags {
  fileUpload: boolean;
  webhook: boolean;
  autoBackup: boolean;
  aiSummary: boolean;
}

export interface SecurityConfig {
  allowedIpRanges: string[];
  requireApprovalForDelete: boolean;
  sessionTimeoutMinutes: number;
}

export interface SystemConfig {
  id: string;
  llm: LLMConfig;
  features: FeatureFlags;
  security: SecurityConfig;
  updatedAt: string;
  updatedBy: string;
}

export interface UpdateConfigRequest {
  llm?: Partial<LLMConfig>;
  features?: Partial<FeatureFlags>;
  security?: Partial<SecurityConfig>;
}

export async function getSystemConfig(): Promise<SystemConfig> {
  const res = await fetch('/api/v1/admin/config');
  const data = await res.json();
  return data.data;
}

export async function updateSystemConfig(req: UpdateConfigRequest): Promise<SystemConfig> {
  const res = await fetch('/api/v1/admin/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

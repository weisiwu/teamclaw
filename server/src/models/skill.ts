// Skill 类型定义

export type SkillCategory = 'build' | 'deploy' | 'test' | 'structure' | 'coding' | 'review' | 'custom';
export type SkillSource = 'generated' | 'user' | 'imported';

export interface SkillDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: SkillCategory;
  source: SkillSource;
  content: string; // Markdown 内容
  filePath?: string;
  applicableAgents: string[];
  enabled: boolean;
  tags: string[];
  version: string;
  createdAt: string;
  updatedAt: string;
}

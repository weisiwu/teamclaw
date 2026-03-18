// Model configuration for AI providers

export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'azure' | 'custom';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

// Medium model for summary generation and code analysis
export const mediumModel: ModelConfig = {
  provider: process.env.AI_PROVIDER as ModelConfig['provider'] || 'openai',
  model: process.env.MEDIUM_MODEL_NAME || 'gpt-4o-mini',
  apiKey: process.env.AI_API_KEY,
  baseUrl: process.env.AI_BASE_URL,
  maxTokens: 2000,
  temperature: 0.3,
};

// Embedding model for vector storage
export const embeddingModel: ModelConfig = {
  provider: process.env.AI_PROVIDER as ModelConfig['provider'] || 'openai',
  model: process.env.EMBEDDING_MODEL_NAME || 'text-embedding-3-small',
  apiKey: process.env.AI_API_KEY,
  baseUrl: process.env.AI_BASE_URL,
  maxTokens: 1000,
  temperature: 0,
};

// Light model for fast classification tasks
export const lightModel: ModelConfig = {
  provider: process.env.AI_PROVIDER as ModelConfig['provider'] || 'openai',
  model: process.env.LIGHT_MODEL_NAME || 'gpt-4o-mini',
  apiKey: process.env.AI_API_KEY,
  baseUrl: process.env.AI_BASE_URL,
  maxTokens: 500,
  temperature: 0.1,
};

export const config = {
  mediumModel,
  embeddingModel,
  lightModel,
};

export default config;

import { TechStack } from './techDetector.js';

interface LLMResponse {
  model: string;
  apiKeyEnv: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

const MEDIUM_MODEL: LLMResponse = {
  model: process.env.MEDIUM_MODEL || 'gpt-4o-mini',
  apiKeyEnv: 'OPENAI_API_KEY',
  baseUrl: process.env.OPENAI_BASE_URL,
  maxTokens: 2048,
  temperature: 0.4,
};

async function callLLM(messages: Array<{ role: string; content: string }>): Promise<string> {
  const apiKey = process.env[MEDIUM_MODEL.apiKeyEnv];
  if (!apiKey) throw new Error(`Missing API key: ${MEDIUM_MODEL.apiKeyEnv}`);

  const baseUrl = (MEDIUM_MODEL.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MEDIUM_MODEL.model,
      messages,
      max_tokens: MEDIUM_MODEL.maxTokens,
      temperature: MEDIUM_MODEL.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return json.choices[0]?.message?.content ?? '';
}

export interface ProjectSummary {
  overview: string;       // ≤500 chars
  techStack: string[];
  architecture: string;
  keyFiles: string[];
  entryPoints: string[];
  language: string;
  generatedAt: string;
}

const SYSTEM_PROMPT = `You are a senior software architect analyzing a codebase. Respond ONLY with valid JSON matching this exact schema:
{
  "overview": "brief 1-2 sentence project description (≤500 chars)",
  "architecture": "1 sentence describing architecture pattern",
  "keyFiles": ["array of 3-5 most important files with paths"],
  "entryPoints": ["array of 2-3 entry point files"],
  "language": "primary programming language"
}`;

export async function generateSummary(
  projectPath: string,
  techStack: TechStack
): Promise<ProjectSummary> {
  const stackDesc = [
    ...techStack.language,
    ...techStack.framework,
    ...techStack.buildTool,
    ...techStack.orm,
  ].join(', ') || 'Unknown';

  const userPrompt = `Analyze this codebase at: ${projectPath}
Tech stack detected: ${stackDesc}
Runtime: ${techStack.runtime.join(', ') || 'Unknown'}
UI: ${techStack.uiFramework.join(', ') || 'None'}
Full-stack: ${techStack.fullStack.join(', ') || 'None'}

Provide a concise JSON summary of this project.`;

  try {
    const content = await callLLM([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);

    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallbackSummary(techStack);
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ProjectSummary>;

    return {
      overview: parsed.overview ?? 'Project summary unavailable.',
      techStack: techStack.language.concat(techStack.framework),
      architecture: parsed.architecture ?? 'Monolithic architecture',
      keyFiles: parsed.keyFiles ?? [],
      entryPoints: parsed.entryPoints ?? [],
      language: parsed.language ?? techStack.language[0] ?? 'Unknown',
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Summary generation failed:', message);
    return fallbackSummary(techStack);
  }
}

function fallbackSummary(techStack: TechStack): ProjectSummary {
  return {
    overview: `A ${techStack.language.join('/') || 'software'} project using ${techStack.framework.join(', ') || 'custom'} stack.`,
    techStack: techStack.language.concat(techStack.framework),
    architecture: 'Modular architecture',
    keyFiles: [],
    entryPoints: [],
    language: techStack.language[0] ?? 'Unknown',
    generatedAt: new Date().toISOString(),
  };
}

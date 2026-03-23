/**
 * Project Summary Generator — LLM 驱动的深度项目摘要生成
 * Step 7 of 11-step import: 基于完整上下文生成结构化项目摘要
 */

import fs from 'fs';
import path from 'path';
import { TechStack } from './techDetector.js';
import { CodeArchitecture } from './codeAnalyzer.js';

export interface ProjectSummary {
  name: string;
  description: string; // 1-2 段描述
  techStack: string[];
  architecture: string; // 架构概述
  keyModules: Array<{
    name: string;
    path: string;
    description: string;
  }>;
  buildInstructions: string; // 构建说明
  deployInstructions: string; // 部署说明
}

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

const SYSTEM_PROMPT = `You are a senior software architect analyzing a codebase. Respond ONLY with valid JSON matching this exact schema:
{
  "name": "project name",
  "description": "1-2 paragraph project description (be specific about what this project does)",
  "techStack": ["language1", "framework1", "tool1"],
  "architecture": "one sentence describing the architecture pattern",
  "keyModules": [{"name": "module name", "path": "src/module", "description": "what this module does"}],
  "buildInstructions": "how to build this project in one sentence",
  "deployInstructions": "how to deploy this project in one sentence"
}`;

export class ProjectSummaryGenerator {
  /**
   * 调用 LLM 生成深度项目摘要
   * 输入：README + 文件树 + package.json + 关键代码片段
   */
  async generate(context: {
    readme: string;
    fileTree: string;
    packageJson: object;
    techStack: TechStack;
    architecture: CodeArchitecture;
    sampleCode?: string[];
  }): Promise<ProjectSummary> {
    const stackDesc =
      [
        ...context.techStack.language,
        ...context.techStack.framework,
        ...context.techStack.buildTool,
      ].join(', ') || 'Unknown';

    const sampleCodeStr = context.sampleCode
      ? `\n\n关键代码片段（前 50 行）：\n${context.sampleCode.slice(0, 3).join('\n\n---FILE---\n\n')}`
      : '';

    const userPrompt = `Analyze this codebase and provide a structured JSON summary.

README:
${context.readme.slice(0, 3000)}

文件树（部分）:
${context.fileTree.slice(0, 2000)}

技术栈: ${stackDesc}
运行时: ${context.techStack.runtime.join(', ') || 'Unknown'}
UI框架: ${context.techStack.uiFramework.join(', ') || 'None'}${sampleCodeStr}

Provide a concise JSON summary of this project.`;

    try {
      const content = await callLLM([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ]);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.fallbackSummary(context.techStack);
      }

      const parsed = JSON.parse(jsonMatch[0]) as Partial<ProjectSummary>;

      return {
        name: parsed.name || 'Unknown Project',
        description: parsed.description || 'Project summary unavailable.',
        techStack:
          parsed.techStack || context.techStack.language.concat(context.techStack.framework),
        architecture: parsed.architecture || 'Monolithic architecture',
        keyModules: parsed.keyModules || [],
        buildInstructions: parsed.buildInstructions || 'npm install && npm run build',
        deployInstructions: parsed.deployInstructions || 'npm start',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[projectSummaryGenerator] LLM call failed:', message);
      return this.fallbackSummary(context.techStack);
    }
  }

  /**
   * 从项目目录加载上下文并生成摘要
   */
  async generateFromProject(
    projectPath: string,
    techStack: TechStack,
    architecture: CodeArchitecture
  ): Promise<ProjectSummary> {
    const readme = this.loadReadme(projectPath);
    const fileTree = this.loadFileTree(projectPath);
    const packageJson = this.loadPackageJson(projectPath);
    const sampleCode = this.loadSampleCode(projectPath);

    return this.generate({
      readme,
      fileTree,
      packageJson,
      techStack,
      architecture,
      sampleCode,
    });
  }

  private loadReadme(projectPath: string): string {
    const patterns = ['README.md', 'README.txt', 'README', 'readme.md'];
    for (const name of patterns) {
      const p = path.join(projectPath, name);
      if (fs.existsSync(p)) {
        try {
          return fs.readFileSync(p, 'utf-8').slice(0, 8000);
        } catch {
          // continue
        }
      }
    }
    return '';
  }

  private loadFileTree(projectPath: string): string {
    const maxDepth = 3;
    const maxFiles = 100;
    const files: string[] = [];

    function walk(dir: string, depth: number) {
      if (depth > maxDepth || files.length >= maxFiles) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.name === 'node_modules' ||
            entry.name === '.git' ||
            entry.name === 'dist' ||
            entry.name === 'build'
          )
            continue;
          const rel = path.relative(projectPath, path.join(dir, entry.name));
          files.push(rel);
          if (entry.isDirectory() && depth < maxDepth) {
            walk(path.join(dir, entry.name), depth + 1);
          }
        }
      } catch {
        // ignore
      }
    }

    walk(projectPath, 0);
    return files.join('\n');
  }

  private loadPackageJson(projectPath: string): object {
    const p = path.join(projectPath, 'package.json');
    if (!fs.existsSync(p)) return {};
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch {
      return {};
    }
  }

  private loadSampleCode(projectPath: string): string[] {
    const patterns = [
      'src/index.ts',
      'src/main.ts',
      'src/app.ts',
      'index.ts',
      'main.ts',
      'app.ts',
      'src/index.js',
      'src/main.js',
    ];
    const results: string[] = [];

    for (const pattern of patterns) {
      const p = path.join(projectPath, pattern);
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf-8');
          results.push(`// ${pattern}\n${content.slice(0, 2000)}`);
          if (results.length >= 3) break;
        } catch {
          // continue
        }
      }
    }

    return results;
  }

  private fallbackSummary(techStack: TechStack): ProjectSummary {
    return {
      name: 'Unknown Project',
      description: `A ${techStack.language.join('/') || 'software'} project.`,
      techStack: techStack.language.concat(techStack.framework),
      architecture: 'Modular architecture',
      keyModules: [],
      buildInstructions: 'npm install && npm run build',
      deployInstructions: 'npm start',
    };
  }
}

import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
  "Access-Control-Max-Age": "86400",
};

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function jsonSuccess(data: unknown, requestId?: string): NextResponse {
  return NextResponse.json({ code: 0, data, requestId }, {
    headers: { ...corsHeaders },
  });
}

function jsonError(message: string, status: number, requestId?: string): NextResponse {
  return NextResponse.json({ code: status, message, requestId }, { status });
}

interface ChangelogChange {
  type: "feature" | "fix" | "improvement" | "breaking" | "docs" | "refactor" | "other";
  description: string;
  files?: string[];
}

interface VersionChangelog {
  id: string;
  versionId: string;
  title: string;
  content: string;
  changes: ChangelogChange[];
  generatedAt: string;
  generatedBy: string;
}

const changelogStore = new Map<string, VersionChangelog>();

/**
 * AI changelog generation prompt
 */
function buildChangelogPrompt(changedFiles: string[]): string {
  const filesList = changedFiles.join("\n");
  return `你是一个专业的变更日志生成器。根据以下变更文件列表，生成一个结构化的变更摘要。

变更文件列表：
${filesList || "(无变更文件)"}

请生成 JSON 格式的变更摘要，包含：
- title: 版本标题
- content: 变更内容概述（中文，50-200字）
- changes: 变更列表，每项包含：
  - type: 变更类型 (feature/fix/improvement/breaking/docs/refactor/other)
  - description: 变更描述（中文，简洁）
  - files: 关联的文件路径列表

只返回 JSON，不要包含其他内容。JSON 格式：
{
  "title": "版本标题",
  "content": "变更概述",
  "changes": [
    { "type": "feature", "description": "描述", "files": ["file1.ts"] }
  ]
}`;
}

/**
 * Call AI to generate changelog
 */
async function generateAIChangelog(changedFiles: string[]): Promise<VersionChangelog> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  
  if (!apiKey) {
    // Fallback to rule-based generation when no AI key
    return generateRuleBasedChangelog(changedFiles);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "你是一个专业的变更日志生成器。" },
          { role: "user", content: buildChangelogPrompt(changedFiles) },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("无法解析 AI 返回的 JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]) as { title: string; content: string; changes: ChangelogChange[] };
    return {
      id: `cl-${Date.now()}`,
      versionId: "",
      title: parsed.title,
      content: parsed.content,
      changes: parsed.changes ?? [],
      generatedAt: new Date().toISOString(),
      generatedBy: "AI",
    };
  } catch (err) {
    console.error("[Changelog Generate] AI generation failed, falling back to rule-based:", err);
    return generateRuleBasedChangelog(changedFiles);
  }
}

/**
 * Rule-based changelog generation (fallback when no AI)
 */
function generateRuleBasedChangelog(changedFiles: string[]): VersionChangelog {
  const changes: ChangelogChange[] = [];
  
  for (const file of changedFiles) {
    const fileName = file.split("/").pop() ?? file;
    const ext = fileName.split(".").pop() ?? "";
    
    let type: ChangelogChange["type"] = "other";
    if (file.includes("test") || file.includes("spec")) {
      type = "other";
    } else if (file.includes("fix")) {
      type = "fix";
    } else if (file.includes("feat") || file.includes("feature")) {
      type = "feature";
    } else if (file.includes("doc") || file.includes("readme")) {
      type = "docs";
    } else if (ext === "css" || ext === "scss" || ext === "style") {
      type = "improvement";
    } else if (["ts", "tsx", "js", "jsx"].includes(ext)) {
      type = "feature";
    }

    changes.push({
      type,
      description: `更新 ${fileName}`,
      files: [file],
    });
  }

  const version = changedFiles.length > 0 ? "新版本" : "版本更新";
  return {
    id: `cl-${Date.now()}`,
    versionId: "",
    title: `${version} 变更日志`,
    content: `本次更新涉及 ${changedFiles.length} 个文件的变更。`,
    changes,
    generatedAt: new Date().toISOString(),
    generatedBy: "system",
  };
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/v1/versions/:id/changelog/generate
 * AI 生成版本变更摘要
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const { id } = await params;
    const body = await request.json() as { changedFiles?: string[] };
    const changedFiles = body.changedFiles ?? [];

    const changelog = await generateAIChangelog(changedFiles);
    changelog.versionId = id;

    // Store in memory
    changelogStore.set(id, changelog);

    return jsonSuccess({ data: changelog }, requestId);
  } catch (err) {
    return jsonError(`生成变更摘要失败: ${err instanceof Error ? err.message : String(err)}`, 500, requestId);
  }
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import Link from "next/link";

const API_BASE = "/api/v1";
import { apiPost, getFriendlyErrorMessage } from "@/lib/api-safe-fetch";

export default function NewVersionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    version: "",
    title: "",
    description: "",
    branch: "main",
    commitHash: "",
  });
  const [touched, setTouched] = useState({ version: false, title: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const versionError = touched.version && !form.version.trim() ? "版本号不能为空" : "";
  const titleError = touched.title && !form.title.trim() ? "标题不能为空" : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.version.trim() || !form.title.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await apiPost(`${API_BASE}/versions`, {
        version: form.version,
        title: form.title,
        description: form.description,
        status: "draft",
        tags: [],
      });
      if (result.success) {
        const created = result.data as { id?: string } | undefined;
        if (created?.id) {
          try {
            await apiPost(`${API_BASE}/versions/${created.id}/git-tags`, {
              tagName: form.version.startsWith("v") ? form.version : `v${form.version}`,
              message: `${form.title}: ${form.description}`,
            });
          } catch {
            // Tag creation failure is non-fatal
          }
        }
        router.push("/versions");
      } else {
        setError(result.error ? getFriendlyErrorMessage(result.error) : "创建失败");
      }
    } catch {
      setError("请求失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/versions">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">创建版本</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5">
        {/* Version ID */}
        <div>
          <Label htmlFor="version">
            版本号 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="version"
            placeholder="例如: v1.0.0"
            value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })}
            onBlur={() => setTouched(t => ({ ...t, version: true }))}
            className={`mt-1 font-mono ${versionError ? "border-red-500 focus:ring-red-500" : ""}`}
            aria-invalid={!!versionError}
            aria-describedby={versionError ? "version-error" : undefined}
          />
          {versionError && (
            <p id="version-error" className="mt-1 text-xs text-red-500">{versionError}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="title">
            标题 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            placeholder="版本标题"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            onBlur={() => setTouched(t => ({ ...t, title: true }))}
            className={`mt-1 ${titleError ? "border-red-500 focus:ring-red-500" : ""}`}
            aria-invalid={!!titleError}
            aria-describedby={titleError ? "title-error" : undefined}
          />
          {titleError && (
            <p id="title-error" className="mt-1 text-xs text-red-500">{titleError}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">摘要</Label>
          <textarea
            id="description"
            placeholder="版本描述（可选）"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* Branch */}
        <div>
          <Label htmlFor="branch">分支</Label>
          <Input
            id="branch"
            placeholder="main"
            value={form.branch}
            onChange={(e) => setForm({ ...form, branch: e.target.value })}
            className="mt-1"
          />
        </div>

        {/* Commit Hash */}
        <div>
          <Label htmlFor="commitHash">Commit Hash（可选）</Label>
          <Input
            id="commitHash"
            placeholder="可选"
            value={form.commitHash}
            onChange={(e) => setForm({ ...form, commitHash: e.target.value })}
            className="mt-1 font-mono"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.push("/versions")}>
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting || !form.version.trim() || !form.title.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                创建版本
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-400">
          提交后将自动创建 Git Tag
        </p>
      </form>
    </div>
  );
}

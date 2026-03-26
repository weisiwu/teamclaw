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

export default function NewTagPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    commitHash: "",
    message: "",
  });
  const [touched, setTouched] = useState({ name: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = touched.name && !form.name.trim() ? "Tag 名称不能为空" : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await apiPost(`${API_BASE}/tags`, {
        name: form.name,
        commitHash: form.commitHash || undefined,
        message: form.message || undefined,
        versionId: "manual",
        versionName: form.name,
      });
      if (result.success) {
        router.push("/tags");
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
        <Link href="/tags">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">创建 Tag</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5">
        {/* Tag name */}
        <div>
          <Label htmlFor="name">
            Tag 名称 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="例如: v1.0.0"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onBlur={() => setTouched(t => ({ ...t, name: true }))}
            className={`mt-1 font-mono ${nameError ? "border-red-500 focus:ring-red-500" : ""}`}
            aria-invalid={!!nameError}
            aria-describedby={nameError ? "name-error" : undefined}
          />
          {nameError && (
            <p id="name-error" className="mt-1 text-xs text-red-500">{nameError}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            受保护 Tag 格式：v1.0.0、v2.0.0 等（匹配 ^v\d+\.0\.0$）
          </p>
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

        {/* Message */}
        <div>
          <Label htmlFor="message">Message / Annotation（可选）</Label>
          <textarea
            id="message"
            placeholder="Tag 描述信息（可选）"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.push("/tags")}>
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting || !form.name.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                创建 Tag
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

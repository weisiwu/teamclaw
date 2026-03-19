"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: "sm" | "default";
}

export function CopyButton({ text, className, size = "default" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const btnSize = size === "sm" ? "p-1" : "p-1.5";

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "rounded-md hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600",
        btnSize,
        className
      )}
      title="复制"
    >
      {copied ? (
        <Check className={cn(iconSize, "text-green-500")} />
      ) : (
        <Copy className={iconSize} />
      )}
    </button>
  );
}

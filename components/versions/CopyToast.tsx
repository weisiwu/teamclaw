"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyToastProps {
  message?: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export function CopyToast({
  message = "已复制到剪贴板",
  visible,
  onClose,
  duration = 2000,
}: CopyToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg shadow-lg text-sm"
        )}
      >
        <Check className="w-4 h-4 text-green-400" />
        <span>{message}</span>
      </div>
    </div>
  );
}

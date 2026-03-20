import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
}

const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  ...props
}: BadgeProps) => {
  const variants = {
    default: "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200",
    success: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    warning: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
    error: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    info: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-150 hover:shadow-sm",
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

export { Badge };

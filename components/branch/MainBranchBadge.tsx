/**
 * MainBranchBadge Component
 * 主分支徽章 - 标识主分支
 */
"use client";

import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MainBranchBadgeProps {
  className?: string;
}

export function MainBranchBadge({ className }: MainBranchBadgeProps) {
  return (
    <Badge variant="success" className={`flex items-center gap-1 ${className}`}>
      <Star className="w-3 h-3 fill-current" />
      主分支
    </Badge>
  );
}

export default MainBranchBadge;

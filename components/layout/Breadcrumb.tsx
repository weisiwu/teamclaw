"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

function useAutoBreadcrumb() {
  const pathname = usePathname();
  
  // Auto-generate breadcrumb from pathname
  const segments = pathname.split("/").filter(Boolean);
  
  if (segments.length === 0) return [];

  const crumbs: BreadcrumbItem[] = [{ label: "首页", href: "/" }];
  let currentPath = "";

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Skip numeric IDs (like project IDs)
    if (/^\d+$/.test(segment)) return;
    
    // Format label
    const label = segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
    
    const isLast = index === segments.length - 1;
    crumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  });

  return crumbs;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  const autoCrumbs = useAutoBreadcrumb();
  const crumbs = items && items.length > 0 ? items : autoCrumbs;

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="面包屑导航" className={cn("flex items-center gap-1 text-sm", className)}>
      {crumbs.map((crumb, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
          )}
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-150 truncate max-w-[120px]"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-900 dark:text-white font-medium truncate max-w-[160px]">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

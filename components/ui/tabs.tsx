"use client";

import { cn } from "@/lib/utils";
import { createContext, useContext } from "react";

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onChange: onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 border-b border-gray-200 dark:border-slate-700",
        "overflow-x-auto scrollbar-hide whitespace-nowrap",
        className
      )}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabsTrigger({ value, children, className, disabled }: TabsTriggerProps) {
  const ctx = useContext(TabsContext);
  
  const isActive = ctx?.value === value;
  
  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => ctx?.onChange(value)}
      className={cn(
        "px-4 py-2.5 text-sm font-medium transition-all duration-200 relative",
        "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200",
        isActive && "text-blue-600 dark:text-blue-400",
        disabled && "opacity-50 cursor-not-allowed",
        !isActive && "hover:bg-gray-50 dark:hover:bg-slate-800 rounded-t-lg",
        className
      )}
    >
      {children}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-tab-underline" />
      )}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const ctx = useContext(TabsContext);
  
  if (ctx?.value !== value) return null;
  
  return (
    <div role="tabpanel" className={cn("pt-4", className)}>
      {children}
    </div>
  );
}

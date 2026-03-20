import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

// Select Context Type
type SelectContextType = {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

// Select Context
const SelectContext = React.createContext<SelectContextType | null>(null);

// Root Select Component
interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value: controlledValue, defaultValue, onValueChange, children }: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || '');
  const [open, setOpen] = React.useState(false);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

// Trigger
export function SelectTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be used within Select');

  return (
    <button
      type="button"
      onClick={() => context.setOpen(!context.open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent focus:border-blue-500 dark:focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 dark:hover:border-slate-400",
        context.open && "ring-2 ring-blue-500 dark:ring-blue-400 border-blue-500 dark:border-blue-500",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className={cn(
        "h-4 w-4 text-gray-400 dark:text-slate-400 shrink-0 transition-transform duration-200",
        context.open && "rotate-180"
      )} />
    </button>
  );
}

// Value
interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within Select');

  return (
    <span className={cn(!context.value && "text-gray-400 dark:text-slate-500")}>
      {context.value || placeholder}
    </span>
  );
}

// Content
interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectContent({ children, className }: SelectContentProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectContent must be used within Select');

  if (!context.open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => context.setOpen(false)}
      />
      <div
        className={cn(
          "absolute z-50 w-full min-w-[160px] mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg py-1 animate-scale-in overflow-hidden",
          className
        )}
      >
        {children}
      </div>
    </>
  );
}

// Item
interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function SelectItem({ value, children, className }: SelectItemProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within Select');

  const isSelected = context.value === value;

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      className={cn(
        "w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100 transition-colors duration-100 hover:bg-blue-50 dark:hover:bg-slate-700 focus:bg-blue-50 dark:focus:bg-slate-700 focus:outline-none",
        isSelected && "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium",
        className
      )}
    >
      {children}
    </button>
  );
}

// Legacy Select component (native version)
export interface LegacySelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly { value: string; label: string }[] | { value: string; label: string }[];
}

export function LegacySelect({ className, options, ...props }: LegacySelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "flex h-10 w-full appearance-none rounded-lg border border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-800 px-3 py-2 pr-8 text-sm text-gray-900 dark:text-gray-100 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent focus:border-blue-500 dark:focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-400 dark:hover:border-slate-400 cursor-pointer",
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-400 pointer-events-none" />
    </div>
  );
}

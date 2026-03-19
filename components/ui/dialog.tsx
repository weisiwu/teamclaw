"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const DialogContext = React.createContext<{
  onOpenChange: (open: boolean) => void;
} | null>(null);

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <DialogContext.Provider value={{ onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={() => onOpenChange(false)}
        />
        <div className="relative z-50">
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  );
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  onClose?: () => void;
}

export function DialogContent({
  className,
  title,
  onClose,
  children,
  ...props
}: DialogContentProps) {
  const dialogContext = React.useContext(DialogContext);
  const handleClose = onClose || (() => dialogContext?.onOpenChange(false));

  return (
    <div className={cn(
      "bg-white rounded-xl shadow-lg w-full max-w-md p-6",
      className
    )} {...props}>
      {(title || dialogContext) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg ml-auto"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(
      "flex justify-end gap-3 mt-6",
      className
    )} {...props} />
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props} />
  );
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-lg font-semibold", className)} {...props} />
  );
}

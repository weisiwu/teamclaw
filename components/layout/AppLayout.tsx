"use client";

import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { X } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar drawer */}
          <div className="relative z-50">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute -right-3 top-4 z-10 w-8 h-8 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="flex-1 min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}

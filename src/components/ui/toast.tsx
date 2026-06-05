"use client";

import { cn } from "@/lib/utils";
import { createContext, useCallback, useContext, useState } from "react";
import { X } from "lucide-react";

type Toast = { id: string; message: string; type?: "success" | "error" | "info" };

const ToastContext = createContext<{
  toast: (message: string, type?: Toast["type"]) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-viewport">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-3 text-[var(--text-sm)] shadow-[var(--shadow-md)]",
              t.type === "success" && "bg-[var(--success-subtle)] border-[var(--success)]/20 text-[var(--success)]",
              t.type === "error" && "bg-[var(--danger-subtle)] border-[var(--danger)]/20 text-[var(--danger)]",
              t.type === "info" && "bg-[var(--surface)] border-[var(--border-subtle)] text-[var(--text)]"
            )}
            role="status"
          >
            {t.message}
            <button
              type="button"
              onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))}
              className="ml-2 opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

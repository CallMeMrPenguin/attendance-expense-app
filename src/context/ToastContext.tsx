'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Floating Modern Dark Toast Notification Stack */}
      <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl border backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-slide-in transition-all ${
              toast.type === 'error'
                ? 'bg-[#150a0f]/95 border-rose-500/40 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                : toast.type === 'info'
                ? 'bg-[#0a0f1d]/95 border-indigo-500/40 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.25)]'
                : 'bg-[#081813]/95 border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
            }`}
          >
            <div className="flex items-center gap-3 text-xs font-bold leading-snug">
              {toast.type === 'error' && (
                <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                  <AlertCircle className="h-4 w-4" />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <Info className="h-4 w-4" />
                </div>
              )}
              {toast.type === 'success' && (
                <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
              <span className="text-white font-extrabold">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ToastVariant = 'default' | 'destructive' | 'success' | 'info';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

export interface ToastInstance extends Required<Omit<ToastOptions, 'durationMs'>> {
  id: number;
  durationMs: number;
}

interface ToastContextValue {
  toasts: ToastInstance[];
  remove: (id: number) => void;
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const instance: ToastInstance = {
      id,
      title: options.title ?? '',
      description: options.description ?? '',
      variant: options.variant ?? 'default',
      durationMs: options.durationMs ?? 5000,
    };
    setToasts((prev) => [instance, ...prev].slice(0, 5));
  }, []);

  const value = useMemo(() => ({ toasts, remove, toast }), [toasts, remove, toast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}




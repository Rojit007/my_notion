'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = sticky
}

type ToastListener = (toasts: Toast[]) => void;

// Singleton event bus — works outside React tree
class ToastBus {
  private toasts: Toast[] = [];
  private listeners: Set<ToastListener> = new Set();

  subscribe(fn: ToastListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const fn of this.listeners) fn([...this.toasts]);
  }

  push(t: Omit<Toast, 'id'>): string {
    const id = crypto.randomUUID();
    this.toasts = [...this.toasts, { ...t, id }];
    this.notify();
    return id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }
}

export const toastBus = new ToastBus();

export function toast(type: ToastType, title: string, message?: string, duration = 4000) {
  return toastBus.push({ type, title, message, duration });
}
toast.success = (title: string, message?: string) => toast('success', title, message);
toast.error   = (title: string, message?: string) => toast('error',   title, message, 6000);
toast.warning = (title: string, message?: string) => toast('warning', title, message);
toast.info    = (title: string, message?: string) => toast('info',    title, message);

/* ---- Single toast card ---- */
function ToastCard({ t, onDismiss }: { t: Toast; onDismiss: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (t.duration && t.duration > 0) {
      timerRef.current = setTimeout(onDismiss, t.duration);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [t.duration, onDismiss]);

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />,
    error:   <XCircle      size={16} style={{ color: 'var(--color-danger)'  }} />,
    warning: <AlertTriangle size={16} style={{ color: 'var(--color-warning)'}} />,
    info:    <Info          size={16} style={{ color: 'var(--color-accent)'  }} />,
  };
  const borderMap: Record<ToastType, string> = {
    success: 'var(--color-success)',
    error:   'var(--color-danger)',
    warning: 'var(--color-warning)',
    info:    'var(--color-accent)',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3 rounded-xl px-4 py-3 shadow-xl"
      style={{
        background: 'var(--color-bg-s2)',
        border: `1px solid ${borderMap[t.type]}40`,
        borderLeft: `3px solid ${borderMap[t.type]}`,
        minWidth: 280, maxWidth: 380,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${borderMap[t.type]}20`,
      }}
    >
      <div className="mt-0.5 shrink-0">{iconMap[t.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-p)' }}>{t.title}</p>
        {t.message && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-s)' }}>{t.message}</p>
        )}
      </div>
      <button
        className="shrink-0 p-0.5 rounded hover:bg-bg-s3 transition-colors"
        style={{ color: 'var(--color-text-t)' }}
        onClick={onDismiss}
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

/* ---- Toast container (mount in root layout) ---- */
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsub = toastBus.subscribe(setToasts);
    return () => { unsub(); };
  }, []);

  const dismiss = useCallback((id: string) => toastBus.dismiss(id), []);

  return (
    <div
      className="fixed flex flex-col gap-2 pointer-events-none"
      style={{ bottom: 24, right: 24, zIndex: 'var(--z-modal)' }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard t={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

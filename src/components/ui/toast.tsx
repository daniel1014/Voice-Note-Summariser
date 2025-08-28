'use client';

import { useEffect } from 'react';
import { ToastInstance, useToast } from './use-toast';

function ToastItem({ t }: { t: ToastInstance }) {
  const { remove } = useToast();

  useEffect(() => {
    const id = setTimeout(() => remove(t.id), t.durationMs);
    return () => clearTimeout(id);
  }, [t.id, t.durationMs, remove]);

  const base = 'rounded-lg shadow-lg text-white p-4 w-[92vw] sm:w-[26rem]';
  const tone =
    t.variant === 'destructive'
      ? 'bg-red-600'
      : t.variant === 'success'
      ? 'bg-emerald-600'
      : t.variant === 'info'
      ? 'bg-gray-800'
      : 'bg-gray-900';

  return (
    <div className={`${base} ${tone}`} role="alert" aria-live="assertive">
      {t.title && <p className="font-semibold mb-0.5">{t.title}</p>}
      {t.description && <p className="text-sm opacity-95 leading-relaxed">{t.description}</p>}
    </div>
  );
}

export default function ToastViewport() {
  const { toasts } = useToast();
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}




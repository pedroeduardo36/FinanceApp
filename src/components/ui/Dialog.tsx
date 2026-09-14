import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Dialog({ children, label, onClose }: { children: ReactNode; label: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} aria-label={label} onCancel={event => { event.preventDefault(); onClose(); }}
    className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl p-0 backdrop:bg-black/50">
    {children}
  </dialog>, document.body);
}

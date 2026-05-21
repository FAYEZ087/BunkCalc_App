import React, { useEffect, useRef } from 'react';

export interface AppModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'alert' | 'confirm' | 'error' | 'success';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const AppModal: React.FC<AppModalProps> = ({
  isOpen,
  title,
  message,
  type = 'alert',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus primary action on open
    const primaryButton = type === 'confirm' && onCancel ? cancelButtonRef.current : confirmButtonRef.current;
    if (primaryButton) {
      primaryButton.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (type === 'confirm' && onCancel) {
          onCancel();
        } else {
          onConfirm();
        }
      }

      if (e.key === 'Tab') {
        const focusableElements = [confirmButtonRef.current, cancelButtonRef.current].filter(Boolean) as HTMLElement[];
        if (focusableElements.length === 2) {
          const first = focusableElements[0];
          const last = focusableElements[1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, type, onConfirm, onCancel]);

  if (!isOpen) return null;

  const isDangerous =
    confirmText.toLowerCase().includes('delete') ||
    confirmText.toLowerCase().includes('reset') ||
    confirmText.toLowerCase().includes('clear') ||
    confirmText.toLowerCase().includes('remove') ||
    confirmText.toLowerCase().includes('bunk') ||
    type === 'error';

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'confirm':
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-950/50 border border-amber-500/30 text-amber-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'alert':
      default:
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-950/50 border border-sky-500/30 text-sky-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-message"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-slate-100 animate-in zoom-in-95 duration-200 flex flex-col gap-4 text-center">
        {renderIcon()}
        
        <div className="space-y-2">
          <h2 id="modal-title" className="text-xl font-bold tracking-tight text-white">
            {title}
          </h2>
          <p id="modal-message" className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        <div className="flex gap-3 mt-2 w-full">
          {type === 'confirm' && onCancel && (
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-700/80 text-slate-300 font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-500 border border-slate-700/50"
            >
              {cancelText}
            </button>
          )}
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 rounded-2xl font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              isDangerous
                ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white focus:ring-rose-500'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white focus:ring-blue-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppModal;

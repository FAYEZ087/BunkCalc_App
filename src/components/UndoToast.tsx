import React, { useEffect, useRef } from 'react';

interface Props {
  subjectName: string;
  status: 'present' | 'absent' | 'cancelled';
  onUndo: () => void;
  onDismiss: () => void;
}

const statusConfig: Record<Props['status'], { label: string; color: string; progressColor: string }> = {
  present: { label: 'Present', color: 'text-green-500', progressColor: 'bg-green-500' },
  absent: { label: 'Absent', color: 'text-red-500', progressColor: 'bg-red-500' },
  cancelled: { label: 'Cancelled', color: 'text-slate-400', progressColor: 'bg-slate-400' },
};

const UndoToast: React.FC<Props> = ({ subjectName, status, onUndo, onDismiss }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { label, color, progressColor } = statusConfig[status];

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, 4000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onDismiss]);

  const handleUndo = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onUndo();
    onDismiss();
  };

  return (
    <>
      <style>{`
        @keyframes undoToastSlideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes undoToastProgressShrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>

      <div
        className="fixed bottom-24 left-4 right-4 z-50"
        style={{
          animation: 'undoToastSlideUp 0.3s ease-out forwards',
        }}
        role="alert"
        aria-live="assertive"
      >
        <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-2xl overflow-hidden">
          {/* Content row */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-200 flex-1 min-w-0">
              Marked{' '}
              <span className="font-semibold text-white truncate">{subjectName}</span>
              {' '}as{' '}
              <span className={`font-bold ${color}`}>{label}</span>
            </p>

            <button
              onClick={handleUndo}
              className="text-blue-400 font-black uppercase text-xs shrink-0 px-3 py-1.5 rounded-lg
                         hover:bg-blue-400/10 active:bg-blue-400/20 transition-colors duration-150"
              aria-label="Undo action"
            >
              Undo
            </button>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1">
            <div
              className={`h-full rounded-b-2xl ${progressColor}`}
              style={{
                animation: 'undoToastProgressShrink 4s linear forwards',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default UndoToast;

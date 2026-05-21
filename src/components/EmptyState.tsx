import React from 'react';

interface Props {
  icon: 'history' | 'stats' | 'calendar';
  title: string;
  subtitle: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const floatKeyframes = `
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-6px);
  }
}
`;

const icons: Record<Props['icon'], React.ReactNode> = {
  history: (
    <svg
      className="h-10 w-10 text-slate-400 dark:text-slate-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
      />
    </svg>
  ),
  stats: (
    <svg
      className="h-10 w-10 text-slate-400 dark:text-slate-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13h4v8H3zm7-5h4v13h-4zm7-5h4v18h-4z"
      />
    </svg>
  ),
  calendar: (
    <svg
      className="h-10 w-10 text-slate-400 dark:text-slate-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
};

const EmptyState: React.FC<Props> = ({ icon, title, subtitle, action }) => {
  return (
    <>
      <style>{floatKeyframes}</style>
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div
          className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-6"
          style={{ animation: 'float 3s ease-in-out infinite' }}
        >
          {icons[icon]}
        </div>
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
          {title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
          {subtitle}
        </p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all"
          >
            {action.label}
          </button>
        )}
      </div>
    </>
  );
};

export default EmptyState;

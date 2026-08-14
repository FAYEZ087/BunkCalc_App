import React from 'react';
import { useUpdateStore } from '../store/useUpdateStore';

export const UpdateBanner: React.FC = () => {
  const { isUpdateAvailable, latestVersion, apkUrl } = useUpdateStore();

  if (!isUpdateAvailable) return null;

  const handleDownload = async () => {
    if (!apkUrl) return;
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: apkUrl });
    } catch {
      window.open(apkUrl, '_blank');
    }
  };

  return (
    <div className="w-full bg-amber-500 text-slate-950 px-4 py-3 font-semibold shadow-md flex items-center justify-between gap-3 text-xs md:text-sm animate-in fade-in duration-300">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <svg className="w-4 h-4 shrink-0 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span className="truncate">
          Update available — BunkCalc v{latestVersion} is out
        </span>
      </div>
      <button
        onClick={handleDownload}
        className="bg-slate-950 text-amber-400 hover:bg-slate-900 active:scale-95 px-3 py-1.5 rounded-lg font-bold text-xs tracking-wide uppercase transition-all shrink-0 cursor-pointer"
      >
        Download
      </button>
    </div>
  );
};

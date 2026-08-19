import React from 'react';
import { APP_VERSION_NAME } from '../lib/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsNewFlashCard: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/10 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                What's New in BunkCalc
              </h2>
              <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                v{APP_VERSION_NAME}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Welcome to the latest update built by PinecoXZ
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            ?
          </button>
        </div>

        {/* Feature list */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">
              Class Timetable Cloud & QR Sharing
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Export and share your weekly class timetable with classmates via 6-letter short codes or camera-scannable QR codes.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">
              Mid-Semester Past Attendance Input
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Joined mid-semester? You can now enter your attended and missed class counts during timetable import or edit them anytime in Subject Details.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">
              Interactive Holiday Manager
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Edit and manage semester breaks directly with automated reminder rescheduling and timetable sync.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">
              Weekly Bunk Strategy & Simulator
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Plan the next 7 days of safe bunks and calculate exact recovery streaks needed to stay safe.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">
              Smart Class Reminders
            </p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Post-class attendance marking notifications sent 10 minutes after lecture end with duplicate suppression.
            </p>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 active:scale-95 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
          >
            Explore BunkCalc v{APP_VERSION_NAME}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import type { Subject } from '../lib/types';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import { calculateSubjectStats, getStatusBgColor } from '../lib/calculations';

import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface Props {
  subject: Subject;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const SubjectCard: React.FC<Props> = ({ subject, onClick, onEdit, onDelete }) => {
  const { records } = useAttendance();
  const { settings } = useSettings();
  const [showMenu, setShowMenu] = React.useState(false);
  const stats = useMemo(() => calculateSubjectStats(subject, records, settings.semesterEndDate, settings.holidays), [subject, records, settings.semesterEndDate, settings.holidays]);

  const isRecoveryMode = stats.bunkBudget < 0;

  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const triggerHaptics = async (style: ImpactStyle) => {
    if (settings.hapticsEnabled) {
      try {
        await Haptics.impact({ style });
      } catch (e) {
        // Safe fallback for web
      }
    }
  };

  const handleCardClick = async () => {
    await triggerHaptics(ImpactStyle.Light);
    onClick();
  };

  const handleMenuClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await triggerHaptics(ImpactStyle.Light);
    setShowMenu(!showMenu);
  };

  const handleAction = async (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    setShowMenu(false);
    await triggerHaptics(ImpactStyle.Medium);
    action();
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`rounded-xl p-4 shadow-md dark:shadow-lg border active:scale-[0.98] transition-all cursor-pointer relative ${
        isRecoveryMode 
          ? 'bg-red-500/10 dark:bg-red-950/30 border-red-500/40' 
          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold truncate text-slate-900 dark:text-white">{subject.name}</h3>
            {subject.isLab && (
              <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0 border border-purple-500/20">
                Lab
              </span>
            )}
            {isRecoveryMode && (
              <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                DANGER
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{subject.credits} Credits • {stats.remainingClasses} remaining</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter text-white ${getStatusBgColor(stats.attendancePct)}`}>
            {stats.attendancePct.toFixed(1)}%
          </div>
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={handleMenuClick}
              className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in duration-100">
                <button 
                  onClick={(e) => handleAction(e, onEdit)}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </button>
                <button 
                  onClick={(e) => handleAction(e, onDelete)}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-transparent">
          <p className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider mb-1">Attended</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.attendedCount} / {stats.totalClasses}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-transparent">
          {isRecoveryMode ? (
            <>
              <p className="text-red-500 dark:text-red-400 text-xs uppercase tracking-wider mb-1 font-bold">Recovery Needed</p>
              <p className="text-sm font-black text-red-600 dark:text-red-400 leading-tight">
                Attend next <span className="underline">{stats.classesNeededToRecover}</span> classes
              </p>
            </>
          ) : (
            <>
              <p className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider mb-1">Bunk Budget</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-500">
                {stats.bunkBudget} {stats.bunkBudget === 1 ? 'class' : 'classes'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectCard;

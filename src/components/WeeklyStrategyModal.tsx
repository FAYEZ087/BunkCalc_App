import React, { useMemo } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import { calculateSubjectStats } from '../lib/calculations';

interface WeeklyStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeeklyStrategyModal: React.FC<WeeklyStrategyModalProps> = ({ isOpen, onClose }) => {
  const { subjects } = useSubjects();
  const { records } = useAttendance();
  const { settings } = useSettings();

  const { subjectStrategies, totalClassesThisWeek, criticalCount, safeCount } = useMemo(() => {
    let totalClasses = 0;

    const strategies = subjects.map((subject) => {
      const stats = calculateSubjectStats(subject, records, settings.semesterEndDate, settings.holidays);
      const multiplier = subject.isLab ? 2 : 1;
      const weeklySlotsCount = (subject.schedule || []).length;
      const sessionsThisWeek = weeklySlotsCount * multiplier;
      totalClasses += sessionsThisWeek;

      const thresholdPct = (subject.threshold || settings.globalThreshold) * 100;
      const isCritical = stats.bunkBudget <= 0 || stats.attendancePct < thresholdPct;
      const isRisky = !isCritical && stats.bunkBudget <= 2;
      const isSafe = !isCritical && !isRisky;

      let advice = '';
      if (isCritical) {
        advice = `Must attend all ${sessionsThisWeek} classes! Need ${stats.classesNeededToRecover} consecutive classes to recover above ${Math.round(thresholdPct)}%.`;
      } else if (isRisky) {
        advice = `Only ${stats.bunkBudget} bunk(s) remaining. Recommended to attend all classes this week.`;
      } else {
        const safeToBunkThisWeek = Math.min(stats.bunkBudget, sessionsThisWeek);
        advice = `You have a comfortable buffer. Can safely skip up to ${safeToBunkThisWeek} class${safeToBunkThisWeek === 1 ? '' : 'es'} if needed.`;
      }

      return {
        subject,
        stats,
        sessionsThisWeek,
        isCritical,
        isRisky,
        isSafe,
        advice,
      };
    });

    const critical = strategies.filter(s => s.isCritical).length;
    const safe = strategies.filter(s => s.isSafe).length;

    return {
      subjectStrategies: strategies,
      totalClassesThisWeek: totalClasses,
      criticalCount: critical,
      safeCount: safe,
    };
  }, [subjects, records, settings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Weekly Bunk Strategy
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Smart game-plan for next 7 days ({totalClassesThisWeek} total classes)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Overall summary banner */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex gap-2">
          <div className="flex-1 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Classes</span>
            <p className="text-xl font-black text-slate-900 dark:text-white">{totalClassesThisWeek}</p>
          </div>
          <div className="flex-1 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Safe Subjects</span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{safeCount}</p>
          </div>
          <div className="flex-1 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">At Risk</span>
            <p className="text-xl font-black text-red-600 dark:text-red-400">{criticalCount}</p>
          </div>
        </div>

        {/* Subject-wise breakdown */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {subjectStrategies.map(({ subject, stats, sessionsThisWeek, isCritical, isRisky, isSafe, advice }) => (
            <div
              key={subject.id}
              className={`p-4 rounded-2xl border transition-all ${
                isCritical
                  ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
                  : isRisky
                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                  : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isCritical ? 'bg-red-500' : isRisky ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                    {subject.name} {subject.isLab ? '(Lab)' : ''}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {sessionsThisWeek} classes this week &bull; Current: {stats.attendancePct.toFixed(1)}%
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isCritical
                      ? 'bg-red-500 text-white'
                      : isRisky
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {isCritical ? 'Must Attend' : isRisky ? 'Caution' : isSafe ? 'Safe' : 'Safe'}
                </span>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium">
                {advice}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold active:scale-95 transition-all shadow-md cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

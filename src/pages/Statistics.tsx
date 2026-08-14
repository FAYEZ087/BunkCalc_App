import React, { useState, useMemo } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import { calculateSubjectStats, getStatusBgColor, parseLocalDate } from '../lib/calculations';
import ShareCard from '../components/ShareCard';
import EmptyState from '../components/EmptyState';
import { shareAttendanceCard } from '../lib/shareCard';
import { AppModal } from '../components/AppModal';
import WeeklyChart from '../components/WeeklyChart';
import WhatIfSimulator from '../components/WhatIfSimulator';

interface Props {
  onOpenHistory: () => void;
}

const Statistics: React.FC<Props> = ({ onOpenHistory }) => {
  const { subjects } = useSubjects();
  const { records } = useAttendance();
  const streak = useAttendance((state) => state.getStreak());
  const { settings } = useSettings();
  const [isSharing, setIsSharing] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type?: 'error' } | null>(null);

  const { totalAttended, totalPossible, overallPct, overallPeakPct, totalSafeBunks } = useMemo(() => {
    let tAttended = 0;
    let tPossible = 0;
    let totalMaxAttended = 0;
    let totalPotentialTotal = 0;

    let totalSafeBunks = 0;

    subjects.forEach((s) => {
      const stats = calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays);
      tAttended += stats.attendedCount;
      tPossible += stats.totalClasses;
      totalMaxAttended += stats.maxAttended;
      totalPotentialTotal += stats.potentialTotal;
      totalSafeBunks += Math.max(0, stats.bunkBudget);
    });

    const oPct = tPossible === 0 ? 100 : (tAttended / tPossible) * 100;
    const oPeakPct = totalPotentialTotal === 0 ? 100 : (totalMaxAttended / totalPotentialTotal) * 100;

    return {
      totalAttended: tAttended,
      totalPossible: tPossible,
      overallPct: oPct,
      overallPeakPct: oPeakPct,
      totalSafeBunks,
    };
  }, [subjects, records, settings.semesterEndDate, settings.holidays]);

  const handleShare = async () => {
    setIsSharing(true);
    setTimeout(async () => {
      const res = await shareAttendanceCard();
      setIsSharing(false);
      if (!res.success) {
        setModal({
          isOpen: true,
          title: "Share Failed",
          message: res.error || "Failed to generate share card.",
          type: "error",
        });
      }
    }, 100);
  };

  // Show empty state if no records
  if (records.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-6 pb-24">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Statistics</h1>
          <p className="text-slate-500 dark:text-slate-400">Semester Projections</p>
        </header>
        <EmptyState 
          icon="stats"
          title="No Data Yet"
          subtitle="Start marking your attendance on the Today tab. Your stats and projections will appear here once you have some records."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-6 pb-24">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Statistics</h1>
          <p className="text-slate-500 dark:text-slate-400">Semester Projections</p>
        </div>
        <div className="flex gap-2 items-center">
          {streak >= 2 && (
            <div className="bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <span className="text-lg">🔥</span>
              <span className="text-orange-500 text-xs font-black">{streak}-day streak</span>
            </div>
          )}
          <button 
            onClick={onOpenHistory}
            className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg active:scale-90 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button 
            onClick={handleShare}
            disabled={isSharing}
            className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-50 shadow-lg active:scale-90 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 text-white">
          <p className="text-blue-100 text-xs font-bold uppercase mb-2">Overall Attendance</p>
          <p className="text-5xl font-black mb-2">{overallPct.toFixed(1)}%</p>
          <div className="bg-white/20 inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase">
            {totalAttended} / {totalPossible} Classes
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      </div>

      <WeeklyChart records={records} threshold={settings.globalThreshold} />

      <section className="mb-8">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Projections</h2>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-bold">Safe Bunk Budget</p>
              <span className="text-green-500 font-bold">Semester-Forward</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Based on your {subjects.length} subjects, you can skip a total of 
              <span className="text-slate-900 dark:text-white font-bold px-1">
                {totalSafeBunks}
              </span> 
              classes right now while staying above {Math.round(settings.globalThreshold * 100)}%.
            </p>
          </div>
          
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm font-bold mb-2">'Perfect Attendance' Goal</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              If you attend every single class from today until {parseLocalDate(settings.semesterEndDate).toLocaleDateString()}, 
              your attendance will peak at <span className="text-blue-500 dark:text-blue-400 font-bold italic">~{overallPeakPct.toFixed(1)}%</span>.
            </p>
          </div>
        </div>
      </section>

      <WhatIfSimulator />

      <section>
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Subject breakdown</h2>
        <div className="space-y-3">
          {subjects.map((s) => {
            const stats = calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays);
            return (
              <div key={s.id} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white block">{s.name}</span>
                  <span className="text-[10px] text-slate-400">Budget: {stats.bunkBudget} bunks</span>
                </div>
                <div className={`text-xs font-black px-3 py-1 rounded-lg text-white ${getStatusBgColor(stats.attendancePct)}`}>
                  {stats.attendancePct.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Hidden Share Card */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
        <ShareCard subjects={subjects} records={records} />
      </div>

      {isSharing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-bold">Generating Share Card...</p>
          </div>
        </div>
      )}

      {modal && (
        <AppModal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          confirmText="OK"
          onConfirm={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default Statistics;

import React, { useMemo } from 'react';
import type { Subject } from '../lib/types';
import { calculateProjections, getStatusBgColor, parseLocalDate } from '../lib/calculations';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';

interface Props {
  subject: Subject;
  onBack: () => void;
}

const SubjectDetail: React.FC<Props> = ({ subject, onBack }) => {
  const { records, unmarkAttendance, markAttendance } = useAttendance();
  const { settings } = useSettings();
  
  const subjectRecords = records
    .filter((r) => r.subjectId === subject.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  
  const projections = useMemo(() => calculateProjections(subject, records, settings.semesterEndDate, settings.holidays), [subject, records, settings.semesterEndDate, settings.holidays]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-6 pb-24">
      <header className="mb-8 flex items-center gap-4">
        <button onClick={onBack} className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold truncate">{subject.name}</h1>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase mb-1">Attendance</p>
          <p className={`text-3xl font-black ${getStatusBgColor(projections.attendancePct).replace('bg-', 'text-')}`}>
            {projections.attendancePct.toFixed(1)}%
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase mb-1">Bunk Budget</p>
          <p className={`text-3xl font-black ${projections.bunkBudget >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {projections.bunkBudget}
          </p>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Attendance Math</h2>
        <div className="space-y-3">
          {(projections.bunkBudget < 0 || projections.attendancePct < subject.threshold * 100) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-4">
              <div className="bg-red-500 h-10 w-10 rounded-full flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Recovery Mode</p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Attend the next <span className="font-black underline">{projections.classesNeededToRecover}</span> classes consecutively to reach {Math.round(subject.threshold * 100)}%.
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="bg-blue-600 h-10 w-10 rounded-full flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Maximum Possible</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                If you attend all <span className="text-slate-900 dark:text-white font-bold">{projections.remainingClasses}</span> remaining classes, you'll reach <span className="text-blue-500 dark:text-blue-400 font-bold">{projections.maxPossiblePct.toFixed(1)}%</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">History</h2>
        <div className="space-y-2">
          {subjectRecords.length === 0 ? (
            <p className="text-center text-slate-400 dark:text-slate-600 py-8 text-sm italic">No records found for this subject.</p>
          ) : (
            subjectRecords.map((record) => (
              <div key={record.id} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{parseLocalDate(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}</p>
                  {record.status !== 'cancelled' ? (
                    <button 
                      onClick={() => markAttendance({ ...record, status: record.status === 'present' ? 'absent' : 'present' })}
                      className={`flex items-center gap-1 text-[10px] font-bold uppercase mt-0.5 px-2 py-1 -ml-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${
                        record.status === 'present' ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {record.status}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>
                  ) : (
                    <p className="text-[10px] font-bold uppercase text-slate-500 mt-0.5">
                      {record.status}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => unmarkAttendance(record.id)}
                  className="text-slate-400 dark:text-slate-600 p-2 hover:text-red-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default SubjectDetail;

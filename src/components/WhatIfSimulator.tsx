import React, { useState, useMemo } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import { calculateSubjectStats, getStatusColor } from '../lib/calculations';
import type { AttendanceRecord } from '../lib/types';

const WhatIfSimulator: React.FC = () => {
  const { subjects } = useSubjects();
  const { records } = useAttendance();
  const { settings } = useSettings();
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [bunkCount, setBunkCount] = useState<number>(1);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];

  const simulation = useMemo(() => {
    if (!selectedSubject) return null;

    // Current stats
    const currentStats = calculateSubjectStats(
      selectedSubject, 
      records, 
      settings.semesterEndDate, 
      settings.holidays
    );

    // Create synthetic records
    const today = new Date().toISOString().split('T')[0];
    const syntheticRecords: AttendanceRecord[] = Array.from({ length: bunkCount }).map((_, i) => ({
      id: `synthetic-${i}`,
      subjectId: selectedSubject.id,
      date: today,
      status: 'absent' as const,
    }));

    const simulatedStats = calculateSubjectStats(
      selectedSubject,
      [...records, ...syntheticRecords],
      settings.semesterEndDate,
      settings.holidays
    );

    const isBelowThreshold = simulatedStats.attendancePct < (selectedSubject.threshold * 100);

    return {
      currentStats,
      simulatedStats,
      isBelowThreshold
    };
  }, [selectedSubject, records, settings, bunkCount]);

  if (subjects.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          What-If Simulator
        </h2>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full active:scale-95 transition-transform"
        >
          {isOpen ? 'Close' : 'Open'}
        </button>
      </div>

      {isOpen && (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Scenario Builder</p>
            <h3 className="font-black text-lg">Predict Your Attendance</h3>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Select Subject</label>
              <select 
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                Classes to Skip: <span className="text-slate-900 dark:text-white">{bunkCount}</span>
              </label>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={bunkCount}
                onChange={(e) => setBunkCount(parseInt(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            {simulation && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Current</p>
                    <p className={`text-xl font-black ${getStatusColor(simulation.currentStats.attendancePct)}`}>
                      {simulation.currentStats.attendancePct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-slate-300 dark:text-slate-600">→</div>
                  <div className="text-center flex-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">After Bunks</p>
                    <p className={`text-xl font-black ${getStatusColor(simulation.simulatedStats.attendancePct)}`}>
                      {simulation.simulatedStats.attendancePct.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${simulation.isBelowThreshold ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30'}`}>
                  {simulation.isBelowThreshold ? (
                    <div>
                      <p className="text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-1.5 mb-1">
                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Danger Zone
                      </p>
                      <p className="text-xs text-red-700/80 dark:text-red-300/80">
                        This drops you below {Math.round((selectedSubject?.threshold ?? settings.globalThreshold) * 100)}%. 
                        You'll need to attend <span className="font-black">{simulation.simulatedStats.classesNeededToRecover}</span> classes consecutively to recover.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-green-600 dark:text-green-400 text-sm font-bold flex items-center gap-1.5 mb-1">
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Safe to Skip
                      </p>
                      <p className="text-xs text-green-700/80 dark:text-green-300/80">
                        You will still be above the required {Math.round((selectedSubject?.threshold ?? settings.globalThreshold) * 100)}%. 
                        Remaining budget: <span className="font-black">{simulation.simulatedStats.bunkBudget}</span> bunks.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default WhatIfSimulator;

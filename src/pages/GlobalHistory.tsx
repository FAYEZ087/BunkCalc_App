import React from 'react';
import { useAttendance } from '../store/useAttendance';
import { useSubjects } from '../store/useSubjects';
import { parseLocalDate } from '../lib/calculations';
import EmptyState from '../components/EmptyState';

interface Props {
  onBack: () => void;
}

const GlobalHistory: React.FC<Props> = ({ onBack }) => {
  const { records, unmarkAttendance } = useAttendance();
  const { subjects } = useSubjects();

  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));

  const getSubjectName = (id: string) => {
    return subjects.find(s => s.id === id)?.name || 'Deleted Subject';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-6 pb-24">
      <header className="mb-8 flex items-center gap-4">
        <button onClick={onBack} className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">Attendance Log</h1>
      </header>

      <div className="space-y-3">
        {sortedRecords.length === 0 ? (
          <EmptyState 
            icon="history"
            title="No Records Yet"
            subtitle="Your attendance log is empty. Start marking classes on the Today tab and your full history will show up here."
          />
        ) : (
          sortedRecords.map((record) => (
            <div key={record.id} className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-lg">
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-0.5">
                  {parseLocalDate(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}
                </p>
                <h4 className="font-bold text-sm truncate text-slate-900 dark:text-white">{getSubjectName(record.subjectId)}</h4>
                <p className={`text-[10px] font-black uppercase mt-1 ${
                  record.status === 'present' ? 'text-green-500' : 
                  record.status === 'absent' ? 'text-red-500' : 'text-slate-500'
                }`}>
                  {record.status}
                </p>
              </div>
              <button 
                onClick={() => unmarkAttendance(record.id)}
                className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GlobalHistory;

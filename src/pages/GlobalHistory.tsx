import React, { useState, useMemo } from 'react';
import { useAttendance } from '../store/useAttendance';
import { useSubjects } from '../store/useSubjects';
import { parseLocalDate } from '../lib/calculations';
import EmptyState from '../components/EmptyState';
import { AppModal } from '../components/AppModal';

interface Props {
  onBack: () => void;
}

const GlobalHistory: React.FC<Props> = ({ onBack }) => {
  const { records, unmarkAttendance, markAttendance } = useAttendance();
  const { subjects } = useSubjects();

  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'error' | 'alert' | 'success' | 'confirm';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);

  const [displayLimit, setDisplayLimit] = useState<number>(50);

  const sortedRecords = useMemo(() => {
    return [...records]
      .filter(record => {
        if (filterSubjectId !== 'all' && record.subjectId !== filterSubjectId) return false;
        if (filterStatus !== 'all' && record.status !== filterStatus) return false;
        if (startDate && record.date < startDate) return false;
        if (endDate && record.date > endDate) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, filterSubjectId, filterStatus, startDate, endDate]);

  const visibleRecords = useMemo(() => {
    return sortedRecords.slice(0, displayLimit);
  }, [sortedRecords, displayLimit]);

  const getSubjectName = (id: string) => {
    return subjects.find(s => s.id === id)?.name || 'Deleted Subject';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-6 pb-24">
      <header className="mb-6 flex items-center gap-4">
        <button onClick={onBack} className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">Attendance Log</h1>
      </header>

      {/* Filter Section */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-6 shadow-sm">
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1 truncate">Subject</label>
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="w-1/3 min-w-[100px]">
            <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
            >
              <option value="all">All</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <button 
          onClick={() => setShowDateFilter(!showDateFilter)}
          className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-500 tracking-widest mt-3 hover:text-blue-600 transition-colors"
        >
          {showDateFilter ? 'Hide Date Filter' : 'Filter by Date'}
          <svg className={`w-3 h-3 transition-transform ${showDateFilter ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDateFilter && (
          <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">Start Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">End Date</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}
        
        <p className="text-[10px] font-bold uppercase text-slate-400 mt-3 text-center tracking-widest">
          Showing {sortedRecords.length} of {records.length} records
        </p>
      </div>

      <div className="space-y-3">
        {visibleRecords.length === 0 ? (
          <EmptyState 
            icon="history"
            title="No Records Yet"
            subtitle="Your attendance log is empty. Start marking classes on the Today tab and your full history will show up here."
          />
        ) : (
          <>
            {visibleRecords.map((record) => (
              <div key={record.id} className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-lg">
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-0.5">
                    {parseLocalDate(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}
                  </p>
                  <h4 className="font-bold text-sm truncate text-slate-900 dark:text-white">{getSubjectName(record.subjectId)}</h4>
                  {record.status !== 'cancelled' ? (
                    <button 
                      onClick={() => markAttendance({ ...record, status: record.status === 'present' ? 'absent' : 'present' })}
                      className={`flex items-center gap-1 text-[10px] font-black uppercase mt-1 px-2 py-1 -ml-2 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${
                        record.status === 'present' ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {record.status}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>
                  ) : (
                    <p className="text-[10px] font-black uppercase mt-1 text-slate-500">
                      {record.status}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setModal({
                    isOpen: true,
                    title: "Delete Record",
                    message: `Delete this ${record.status} record for ${getSubjectName(record.subjectId)} on ${parseLocalDate(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}?`,
                    type: "confirm",
                    confirmText: "Delete",
                    cancelText: "Cancel",
                    onConfirm: () => {
                      unmarkAttendance(record.id);
                      setModal(null);
                    }
                  })}
                  className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            {sortedRecords.length > displayLimit && (
              <button
                onClick={() => setDisplayLimit(prev => prev + 50)}
                className="w-full mt-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Load More Records ({sortedRecords.length - displayLimit} remaining)
              </button>
            )}
          </>
        )}
      </div>

      {modal && (
        <AppModal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          confirmText={modal.confirmText}
          cancelText={modal.cancelText}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default GlobalHistory;

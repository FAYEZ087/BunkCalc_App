import React, { useState } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  onBack: () => void;
}

const CalendarView: React.FC<Props> = ({ onBack }) => {
  const { subjects } = useSubjects();
  const { records, markAttendance, unmarkAttendance } = useAttendance();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');

  const selectedDateStr = selectedDate ? selectedDate.toLocaleDateString('en-CA') : null;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to get scheduled subjects for a date
  const getSubjectsForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    return subjects.filter(sub => sub.schedule.some(slot => Number(slot.day) === dayOfWeek));
  };

  // Helper to get attendance status for a subject on a date
  const getStatus = (subjectId: string, dateStr: string) => {
    const record = records.find(r => r.subjectId === subjectId && r.date === dateStr);
    return record ? record.status : 'unmarked';
  };

  // Generate calendar grid
  const renderCalendarDays = () => {
    const cells = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Header row
    days.forEach(day => {
      cells.push(
        <div key={day} className="text-center text-xs font-bold text-slate-500 py-2">
          {day}
        </div>
      );
    });

    // Empty cells before first day
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toLocaleDateString('en-CA');
      const isFuture = dateStr > todayStr;
      const isToday = dateStr === todayStr;
      const isSelected = selectedDateStr === dateStr;

      const scheduledSubjects = getSubjectsForDate(date);
      const dots = scheduledSubjects.map(sub => getStatus(sub.id, dateStr));

      cells.push(
        <button
          key={d}
          disabled={isFuture}
          onClick={() => setSelectedDate(date)}
          className={`h-12 flex flex-col items-center justify-center rounded-xl relative transition-all ${
            isFuture ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'
          } ${
            isSelected ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500' : 
            isToday ? 'ring-2 ring-blue-500/50' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
          }`}
        >
          <span className={`text-sm font-bold ${
            isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
          }`}>
            {d}
          </span>
          {!isFuture && dots.length > 0 && (
            <div className="flex gap-0.5 mt-1">
              {dots.map((status, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full ${
                    status === 'present' ? 'bg-emerald-500' :
                    status === 'absent' ? 'bg-red-500' :
                    status === 'cancelled' ? 'bg-slate-400' :
                    'bg-blue-400'
                  }`}
                />
              ))}
            </div>
          )}
        </button>
      );
    }

    return cells;
  };

  const selectedSubjects = selectedDate ? getSubjectsForDate(selectedDate) : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 pb-24 flex flex-col">
      <header className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl active:bg-slate-200 dark:active:bg-slate-800 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold italic text-blue-500">Attendance Calendar</h1>
        <div className="w-10"></div>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className="p-2 text-slate-500 hover:text-blue-500 active:bg-slate-100 dark:active:bg-slate-800 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold">{monthNames[month]} {year}</h2>
          <button onClick={handleNextMonth} className="p-2 text-slate-500 hover:text-blue-500 active:bg-slate-100 dark:active:bg-slate-800 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {renderCalendarDays()}
        </div>
      </div>

      {selectedDate && (
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
            Classes on {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </h3>
          
          {selectedSubjects.length === 0 ? (
            <div className="text-center p-8 bg-slate-100 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 font-medium">No classes scheduled for this day.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {selectedSubjects.map(subject => {
                if (!selectedDateStr) return null;
                const record = records.find(r => r.subjectId === subject.id && r.date === selectedDateStr);
                const status = record ? record.status : 'unmarked';

                return (
                  <div key={subject.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{subject.name}</span>
                      {status !== 'unmarked' && (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          status === 'present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                          status === 'absent' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {status.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {status === 'unmarked' ? (
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => markAttendance({
                            id: uuidv4(),
                            subjectId: subject.id,
                            date: selectedDateStr,
                            status: 'present'
                          })}
                          className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 py-2 rounded-lg font-bold text-sm active:bg-emerald-100 dark:active:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                          Present
                        </button>
                        <button
                          onClick={() => markAttendance({
                            id: uuidv4(),
                            subjectId: subject.id,
                            date: selectedDateStr,
                            status: 'absent'
                          })}
                          className="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 py-2 rounded-lg font-bold text-sm active:bg-red-100 dark:active:bg-red-500/20 border border-red-200 dark:border-red-500/30 flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                          Absent
                        </button>
                        <button
                          onClick={() => markAttendance({
                            id: uuidv4(),
                            subjectId: subject.id,
                            date: selectedDateStr,
                            status: 'cancelled'
                          })}
                          className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 py-2 rounded-lg font-bold text-sm active:bg-slate-200 dark:active:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {status !== 'cancelled' && (
                          <button
                            onClick={async () => {
                              if (record) {
                                await markAttendance({
                                  ...record,
                                  status: status === 'present' ? 'absent' : 'present'
                                });
                              }
                            }}
                            className="flex-1 bg-slate-100 dark:bg-slate-800 py-2 rounded-lg font-bold text-sm active:bg-slate-200 dark:active:bg-slate-700 text-slate-700 dark:text-slate-300"
                          >
                            Mark {status === 'present' ? 'Absent' : 'Present'}
                          </button>
                        )}
                        <button
                          onClick={() => record && unmarkAttendance(record.id)}
                          className={`${status === 'cancelled' ? 'flex-1' : 'px-4'} bg-slate-100 dark:bg-slate-800 py-2 rounded-lg font-bold text-sm active:bg-slate-200 dark:active:bg-slate-700 text-red-500`}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarView;

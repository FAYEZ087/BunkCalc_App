import React, { useState } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import SubjectCard from '../components/SubjectCard';
import AlertBanner from '../components/AlertBanner';
import SubjectModal from '../components/SubjectModal';
import TimetableGrid from '../components/TimetableGrid';
import type { Subject } from '../lib/types';

interface Props {
  onSelectSubject: (subject: Subject) => void;
}

const Home: React.FC<Props> = ({ onSelectSubject }) => {
  const { subjects, addSubject, updateSubject, deleteSubject } = useSubjects();
  const streak = useAttendance((state) => state.getStreak());
  const [modalMode, setModalMode] = useState<'none' | 'add' | 'edit'>('none');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'timetable'>('dashboard');
  const [now, setNow] = useState(new Date());

  // Update clock every minute
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getNextClass = () => {
    if (subjects.length === 0) return null;
    
    const today = now.getDay();
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    let upcoming: { subject: Subject; time: string }[] = [];
    
    subjects.forEach(s => {
      s.schedule.forEach(slot => {
        if (Number(slot.day) === today && slot.slot > currentTimeStr) {
          upcoming.push({ subject: s, time: slot.slot });
        }
      });
    });

    upcoming.sort((a, b) => a.time.localeCompare(b.time));
    return upcoming[0] || null;
  };

  const nextClass = getNextClass();

  const handleSaveSubject = (subject: Subject) => {
    if (modalMode === 'add') {
      addSubject(subject);
    } else {
      updateSubject(subject);
    }
    setModalMode('none');
    setEditingSubject(null);
  };

  const handleDeleteSubject = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      deleteSubject(id);
    }
  };

  const handleEditClick = (subject: Subject) => {
    setEditingSubject(subject);
    setModalMode('edit');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-4 pb-24">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-500 italic uppercase">BunkCalc</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-widest">DASHBOARD</p>
        </div>
        <div className="flex gap-2 items-center">
          {streak >= 2 && (
            <div className="bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse">
              <span className="text-lg">🔥</span>
              <span className="text-orange-500 text-xs font-black">{streak}</span>
            </div>
          )}
          <button 
            onClick={() => setModalMode('add')}
            className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg active:scale-90 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      <AlertBanner subjects={subjects} />

      {/* View Toggle */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-6 border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setViewMode('dashboard')}
          className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
            viewMode === 'dashboard'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setViewMode('timetable')}
          className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
            viewMode === 'timetable'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Timetable
        </button>
      </div>

      {viewMode === 'dashboard' ? (
        <>
          {nextClass && (
            <div className="bg-blue-600 rounded-3xl p-6 mb-8 shadow-xl shadow-blue-500/20 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1">Upcoming Next</p>
              <h3 className="text-2xl font-black mb-1 truncate pr-12">{nextClass.subject.name}</h3>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">{nextClass.time}</span>
                <span className="text-blue-100 text-xs font-medium">Starts in {
                  (() => {
                    const [h, m] = nextClass.time.split(':').map(Number);
                    const diff = (h * 60 + m) - (now.getHours() * 60 + now.getMinutes());
                    return diff > 60 ? `${Math.floor(diff/60)}h ${diff%60}m` : `${diff} mins`;
                  })()
                }</span>
              </div>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          )}

          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Your Subjects</h2>
            <div className="grid gap-4">
              {subjects.map((subject) => (
                <SubjectCard 
                  key={subject.id} 
                  subject={subject} 
                  onClick={() => onSelectSubject(subject)}
                  onEdit={() => handleEditClick(subject)}
                  onDelete={() => handleDeleteSubject(subject.id, subject.name)}
                />
              ))}
            </div>
          </section>
        </>
      ) : (
        <TimetableGrid />
      )}

      {modalMode !== 'none' && (
        <SubjectModal 
          subject={editingSubject || undefined}
          onSave={handleSaveSubject}
          onCancel={() => {
            setModalMode('none');
            setEditingSubject(null);
          }}
        />
      )}
    </div>
  );
};

export default Home;

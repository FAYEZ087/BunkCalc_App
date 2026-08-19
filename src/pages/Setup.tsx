import React, { useState } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useSettings } from '../store/useSettings';
import { v4 as uuidv4 } from 'uuid';
import type { Subject } from '../lib/types';
import { sanitizeName } from '../lib/validation';
import { AppModal } from '../components/AppModal';
import { TimetableShareModal } from '../components/TimetableShareModal';

const Setup: React.FC = () => {
  const { addSubject } = useSubjects();
  const { settings, setSettings } = useSettings();
  
  const [step, setStep] = useState(1);
  const [tempSubjects, setTempSubjects] = useState<Subject[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Current subject being added
  const [name, setName] = useState('');
  const [credits, setCredits] = useState(3);
  const [isLab, setIsLab] = useState(false);
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [globalSlot, setGlobalTime] = useState('09:00');
  const [scheduleMap, setScheduleMap] = useState<Record<number, string>>({});
  const [attendedSoFar, setAttendedSoFar] = useState<number>(0);
  const [missedSoFar, setMissedSoFar] = useState<number>(0);

  const [subjectThreshold, setSubjectThreshold] = useState<number>(settings.globalThreshold);

  // Modal Dialog state
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'error' | 'alert' | 'success' | 'confirm';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleAddSubject = () => {
    const days = Object.keys(scheduleMap).map(Number);
    const sanitizedName = sanitizeName(name);
    if (!sanitizedName || days.length === 0) return;
    
    // Check for duplicate subject names
    const nameExists = tempSubjects.some(s => s.name.toLowerCase().trim() === sanitizedName.toLowerCase().trim());
    if (nameExists) {
      setModal({
        isOpen: true,
        title: "Duplicate Subject",
        message: `A subject named "${sanitizedName}" has already been added.`,
        type: "error",
        confirmText: "OK",
        onConfirm: () => setModal(null)
      });
      return;
    }
    
    const newSub: Subject = {
      id: uuidv4(),
      name: sanitizedName,
      credits,
      threshold: subjectThreshold,
      isLab,
      schedule: days.map(day => ({ 
        day, 
        slot: useCustomTime ? scheduleMap[day] : globalSlot 
      })),
      attendedSoFar: Math.max(0, attendedSoFar),
      missedSoFar: Math.max(0, missedSoFar),
    };
    
    setTempSubjects([...tempSubjects, newSub]);
    
    // Reset form
    setName('');
    setCredits(3);
    setIsLab(false);
    setUseCustomTime(false);
    setGlobalTime('09:00');
    setScheduleMap({});
    setAttendedSoFar(0);
    setMissedSoFar(0);
  };

  const toggleDay = (idx: number) => {
    const newMap = { ...scheduleMap };
    if (newMap[idx] !== undefined) {
      delete newMap[idx];
    } else {
      newMap[idx] = globalSlot;
    }
    setScheduleMap(newMap);
  };

  const updateTime = (idx: number, time: string) => {
    setScheduleMap({ ...scheduleMap, [idx]: time });
  };

  const handleFinish = () => {
    tempSubjects.forEach(s => addSubject(s));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-6 pb-12 flex flex-col transition-colors duration-300">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-blue-600 dark:text-blue-500 italic uppercase">BunkCalc</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-widest uppercase">Semester Setup</p>
      </header>

      {step === 1 && (
        <div className="flex-1 animate-in fade-in slide-in-from-right duration-300">
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-1">Academic Preferences</h2>
            <p className="text-xs text-slate-500 italic">These can be changed later in settings.</p>
          </div>

          <div className="space-y-6 bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Attendance Threshold (%)</label>
              <select 
                value={Math.round(settings.globalThreshold * 100)}
                onChange={(e) => setSettings({ ...settings, globalThreshold: Number(e.target.value) / 100 })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 outline-none focus:border-blue-500 text-slate-900 dark:text-white font-bold"
              >
                {[60, 65, 70, 75, 80, 85, 90].map(val => (
                  <option key={val} value={val}>{val}%</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Semester End Date</label>
              <input 
                type="date" 
                value={settings.semesterEndDate.split('T')[0]}
                onChange={(e) => e.target.value && setSettings({ ...settings, semesterEndDate: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 outline-none focus:border-blue-500 text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <button 
            onClick={() => {
              const endDate = new Date(settings.semesterEndDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              if (endDate <= today) {
                setModal({
                  isOpen: true,
                  title: "Invalid Semester End Date",
                  message: "Semester end date must be in the future.",
                  type: "error",
                  confirmText: "OK",
                  onConfirm: () => setModal(null)
                });
                return;
              }
              setStep(2);
            }}
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all mt-10"
          >
            Next Step
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 animate-in fade-in slide-in-from-right duration-300 max-h-[80vh] overflow-y-auto pr-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Add Subjects</h2>
            <button 
              onClick={() => setStep(1)}
              className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>

          {/* Quick Import from Classmate Banner */}
          <div 
            onClick={() => setShowImportModal(true)}
            className="mb-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/25 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:border-blue-500/40 active:scale-[0.99] transition-all shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">⚡</span>
              <div>
                <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Got a Code / QR from a Classmate?
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Import your section's entire timetable in 1 second
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Import →</span>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-8">
            <div className="space-y-6">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Subject Name</label>
                <input 
                  placeholder="e.g. Data Structures" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors text-slate-900 dark:text-white"
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Credits</label>
                  <select 
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Type</label>
                  <select 
                    value={isLab ? 'lab' : 'theory'}
                    onChange={(e) => setIsLab(e.target.value === 'lab')}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="theory">Theory</option>
                    <option value="lab">Lab</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    Lab sessions count as 2 classes in attendance and bunk calculations.
                  </p>
                </div>
                <div className="flex-1">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Target %</label>
                  <select 
                    value={Math.round(subjectThreshold * 100)}
                    onChange={(e) => setSubjectThreshold(Number(e.target.value) / 100)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500 text-slate-900 dark:text-white font-bold"
                  >
                    {[60, 65, 70, 75, 80, 85, 90].map(val => (
                      <option key={val} value={val}>{val}%</option>
                    ))}
                  </select>
                </div>
              </div>

              {!useCustomTime && (
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Class Time</label>
                  <input 
                    type="time"
                    value={globalSlot}
                    onChange={(e) => setGlobalTime(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              )}

              <div className="flex items-center justify-between bg-white dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Custom timing</p>
                  <p className="text-[10px] text-slate-500 italic">Diff times on diff days</p>
                </div>
                <button 
                  onClick={() => setUseCustomTime(!useCustomTime)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${useCustomTime ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${useCustomTime ? 'left-5' : 'left-1'}`}></div>
                </button>
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Class Schedule</label>
                <div className="grid grid-cols-4 gap-2">
                  {daysOfWeek.map((day, idx) => {
                    const isActive = scheduleMap[idx] !== undefined;
                    return (
                      <button
                        key={day}
                        onClick={() => toggleDay(idx)}
                        className={`py-2 rounded-lg text-[10px] font-black transition-all ${
                          isActive 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-transparent'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                
                {useCustomTime && Object.keys(scheduleMap).length > 0 && (
                  <div className="mt-4 space-y-2 max-h-32 overflow-y-auto pr-1">
                    {Object.keys(scheduleMap).map(Number).map(dayIdx => (
                      <div key={dayIdx} className="flex items-center justify-between gap-4">
                        <span className="text-xs font-bold text-slate-500 w-8">{daysOfWeek[dayIdx]}</span>
                        <input 
                          type="time"
                          value={scheduleMap[dayIdx]}
                          onChange={(e) => updateTime(dayIdx, e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold outline-none text-slate-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Mid-Semester History (Optional)</p>
                <p className="text-[10px] text-slate-500 italic">Fill this in if you already have past attendance history this semester.</p>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Attended So Far</label>
                    <input 
                      type="number" 
                      min={0}
                      value={attendedSoFar}
                      onChange={(e) => setAttendedSoFar(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-sm outline-none focus:border-blue-500 font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Missed So Far</label>
                    <input 
                      type="number" 
                      min={0}
                      value={missedSoFar}
                      onChange={(e) => setMissedSoFar(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-sm outline-none focus:border-blue-500 font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleAddSubject}
                disabled={!name || Object.keys(scheduleMap).length === 0}
                className="w-full bg-slate-200 dark:bg-slate-800 py-3 rounded-xl text-xs font-black uppercase text-blue-600 dark:text-blue-400 border border-blue-500/20 disabled:opacity-50"
              >
                + Add Subject
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-8">
            {tempSubjects.length > 0 && <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Added Subjects</p>}
            {tempSubjects.map((s, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom duration-200">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{s.name}</p>
                  <p className="text-[10px] text-slate-500">{s.schedule.length} sessions per week</p>
                </div>
                <button 
                  onClick={() => setTempSubjects(tempSubjects.filter((_, idx) => idx !== i))}
                  className="text-red-500 p-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button 
            disabled={tempSubjects.length === 0}
            onClick={handleFinish}
            className="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-green-500/20 active:scale-95 transition-all disabled:opacity-50 mt-auto"
          >
            Finish & Launch
          </button>
        </div>
      )}

      {modal && (
        <AppModal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          confirmText={modal.confirmText}
          cancelText={modal.cancelText}
          onConfirm={modal.onConfirm}
          onCancel={modal.onCancel}
        />
      )}

      {/* Timetable Share & Import Modal */}
      <TimetableShareModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
};

export default Setup;

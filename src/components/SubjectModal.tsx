import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Subject } from '../lib/types';
import { useSettings } from '../store/useSettings';
import { useSubjects } from '../store/useSubjects';
import { sanitizeName, validateSubjectName } from '../lib/validation';
import { AppModal } from './AppModal';

interface Props {
  subject?: Subject; // If provided, we are editing
  onSave: (subject: Subject) => void;
  onCancel: () => void;
}

const SubjectModal: React.FC<Props> = ({ subject, onSave, onCancel }) => {
  const { settings } = useSettings();
  const [name, setName] = useState(subject?.name || '');
  const [credits, setCredits] = useState(subject?.credits || 3);
  const [isLab, setIsLab] = useState<boolean>(subject?.isLab || (subject as any)?.labMultiplier === 2 || false);
  
  // New state: Use custom time per day
  const [useCustomTime, setUseCustomTime] = useState(
    subject ? subject.schedule.some((s, _, arr) => s.slot !== arr[0].slot) : false
  );
  const [globalSlot, setGlobalTime] = useState(subject?.schedule[0]?.slot || '09:00');

  // Map of day -> slot
  const [scheduleMap, setScheduleMap] = useState<Record<number, string>>(
    subject?.schedule.reduce((acc, curr) => ({ ...acc, [curr.day]: curr.slot }), {}) || {}
  );

  const [attendedSoFar, setAttendedSoFar] = useState<number>(subject?.attendedSoFar || 0);
  const [missedSoFar, setMissedSoFar] = useState<number>(subject?.missedSoFar || 0);
  const [threshold, setThreshold] = useState<number>(subject?.threshold || settings.globalThreshold);

  // Modal Dialog state for validation/errors
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'error' | 'alert' | 'success' | 'confirm';
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleSave = () => {
    const days = Object.keys(scheduleMap).map(Number);
    const sanitizedName = sanitizeName(name);
    
    // Read pre-existing names (excluding the one being currently edited)
    const existingNames = useSubjects.getState().subjects
      .filter(s => s.id !== subject?.id)
      .map(s => s.name);
      
    const validation = validateSubjectName(sanitizedName, existingNames);
    if (!validation.valid) {
      setModal({
        isOpen: true,
        title: "Validation Error",
        message: validation.error || "Invalid subject name.",
        type: "error",
        confirmText: "OK",
        onConfirm: () => setModal(null)
      });
      return;
    }

    if (days.length === 0) {
      setModal({
        isOpen: true,
        title: "Schedule Required",
        message: "Please select at least one class schedule day.",
        type: "error",
        confirmText: "OK",
        onConfirm: () => setModal(null)
      });
      return;
    }
    
    const newSub: Subject = {
      id: subject?.id || uuidv4(),
      name: sanitizedName,
      credits,
      threshold,
      isLab,
      schedule: days.map(day => ({ 
        day, 
        slot: useCustomTime ? scheduleMap[day] : globalSlot 
      })),
      attendedSoFar: Math.max(0, attendedSoFar),
      missedSoFar: Math.max(0, missedSoFar),
    };
    
    onSave(newSub);
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

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/90 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        <header className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{subject ? 'Edit Subject' : 'Add New Subject'}</h2>
          <button onClick={onCancel} className="text-slate-400 dark:text-slate-500 p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="space-y-6">
          <div>
            <label className="block text-slate-500 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Subject Name</label>
            <input 
              autoFocus
              placeholder="e.g. Data Structures" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors text-slate-900 dark:text-white"
            />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-slate-500 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Credits</label>
              <select 
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              >
                {[1, 2, 3, 4, 5].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-slate-500 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Type</label>
              <select 
                value={isLab ? 'lab' : 'theory'}
                onChange={(e) => setIsLab(e.target.value === 'lab')}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              >
                <option value="theory">Theory</option>
                <option value="lab">Lab</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1 italic">
                Mark as lab to display as a 2-hour slot. Does not affect attendance count.
              </p>
            </div>
            <div className="flex-1">
              <label className="block text-slate-500 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Target %</label>
              <select 
                value={Math.round(threshold * 100)}
                onChange={(e) => setThreshold(Number(e.target.value) / 100)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500 text-slate-900 dark:text-white font-bold"
              >
                {[60, 65, 70, 75, 80, 85, 90].map(val => (
                  <option key={val} value={val}>{val}%</option>
                ))}
              </select>
            </div>
          </div>

          {!useCustomTime && (
            <div>
              <label className="block text-slate-500 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Class Time</label>
              <input 
                type="time"
                value={globalSlot}
                onChange={(e) => setGlobalTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-sm outline-none focus:border-blue-500 text-slate-900 dark:text-white font-bold"
              />
            </div>
          )}

          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Custom daily timing</p>
              <p className="text-[10px] text-slate-500 italic">Enable for different times on different days</p>
            </div>
            <button 
              onClick={() => setUseCustomTime(!useCustomTime)}
              className={`w-12 h-6 rounded-full transition-colors relative ${useCustomTime ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${useCustomTime ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Selected Days</label>
            <div className="space-y-2">
              {daysOfWeek.map((day, idx) => {
                const isActive = scheduleMap[idx] !== undefined;
                return (
                  <div key={day} className="flex items-center gap-3">
                    <button
                      onClick={() => toggleDay(idx)}
                      className={`w-12 h-10 rounded-xl text-xs font-black transition-all ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {day}
                    </button>
                    {isActive && useCustomTime ? (
                      <input 
                        type="time"
                        value={scheduleMap[idx]}
                        onChange={(e) => updateTime(idx, e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white animate-in slide-in-from-left duration-200"
                      />
                    ) : isActive && !useCustomTime ? (
                       <div className="flex-1 text-xs text-slate-500 dark:text-slate-400 font-bold px-2">
                        Following global time ({globalSlot})
                       </div>
                    ) : (
                      <div className="flex-1 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-2 text-[10px] text-slate-400 dark:text-slate-700 font-medium italic">
                        Off day
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Mid-Semester History (Optional)</p>
            <p className="text-[10px] text-slate-500 italic">Classes attended/missed prior to app usage.</p>
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
            disabled={!name || Object.keys(scheduleMap).length === 0}
            onClick={handleSave}
            className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 mt-4"
          >
            {subject ? 'Update Subject' : 'Save Subject'}
          </button>
        </div>
      </div>

      {modal && (
        <AppModal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          confirmText={modal.confirmText}
          onConfirm={modal.onConfirm}
        />
      )}
    </div>
  );
};

export default SubjectModal;

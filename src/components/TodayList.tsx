import React, { useState, useRef, useCallback } from 'react';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import { v4 as uuidv4 } from 'uuid';
import type { AttendanceStatus, Subject } from '../lib/types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import UndoToast from './UndoToast';
import { AppModal } from './AppModal';

import { calculateSubjectStats } from '../lib/calculations';

const TodayList: React.FC = () => {
  const subjects = useSubjects((state) => state.subjects);
  const { records, markAttendance, unmarkAttendance, undoLastAction, clearLastAction } = useAttendance();
  const settings = useSettings((state) => state.settings);
  
  // Swipe and snap state per subject
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});
  const [snappedLeft, setSnappedLeft] = useState<Record<string, boolean>>({});
  const pointerStart = useRef<{ x: number; y: number; id: string } | null>(null);
  const isSwipingRef = useRef(false);

  // Toast state
  const [toast, setToast] = useState<{ subjectName: string; status: AttendanceStatus } | null>(null);

  // Modal Dialog state for validation/errors
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'error' | 'alert' | 'success' | 'confirm';
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  // Helper to determine bunk safety
  const getBunkSafety = (subject: Subject) => {
    const stats = calculateSubjectStats(subject, records);
    const threshold = subject.threshold * 100;
    const warningZone = (subject.threshold + settings.warningBuffer) * 100;
    
    const newTotal = stats.totalClasses + subject.labMultiplier;
    const newPct = (stats.attendedCount / newTotal) * 100;

    if (newPct < threshold) return { label: 'CRITICAL', color: 'bg-red-500 text-white' };
    if (newPct <= warningZone) return { label: 'RISKY', color: 'bg-amber-500 text-white' };
    return { label: 'SAFE', color: 'bg-green-500 text-white' };
  };

  // Use local date for consistency across the app
  const now = new Date();
  const today = now.getDay(); // 0-6 local
  
  // Format: YYYY-MM-DD local
  const dateStr = now.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD

  const todayClasses = subjects.filter((s) => 
    s.schedule.some((slot) => Number(slot.day) === today)
  );

  const handleMark = useCallback(async (subjectId: string, status: AttendanceStatus, slot: string) => {
    // Check if class has started
    const [hours, minutes] = slot.split(':').map(Number);
    const classStartTime = new Date();
    classStartTime.setHours(hours, minutes, 0, 0);

    if (new Date().getTime() < classStartTime.getTime()) {
      setModal({
        isOpen: true,
        title: "Class Not Started",
        message: "Class hasn't started yet! Please mark your attendance after it begins.",
        type: "alert",
        confirmText: "OK",
        onConfirm: () => setModal(null)
      });
      // Slide it back to closed
      setSwipeOffsets(prev => ({ ...prev, [subjectId]: 0 }));
      setSnappedLeft(prev => ({ ...prev, [subjectId]: false }));
      return;
    }

    // Trigger haptic feedback
    if (settings.hapticsEnabled) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (err) {
        console.warn('Haptic feedback failed or not supported:', err);
      }
    }

    const subjectName = subjects.find(s => s.id === subjectId)?.name || '';

    await markAttendance({
      id: uuidv4(),
      subjectId,
      date: dateStr,
      status,
    });

    // Reset swipe and snap offsets for this subject
    setSwipeOffsets(prev => ({ ...prev, [subjectId]: 0 }));
    setSnappedLeft(prev => ({ ...prev, [subjectId]: false }));

    // Show undo toast
    setToast({ subjectName, status });
  }, [settings.hapticsEnabled, markAttendance, dateStr, subjects]);

  const handleUndo = useCallback(async () => {
    await undoLastAction();
    setToast(null);
  }, [undoLastAction]);

  const handleDismissToast = useCallback(() => {
    clearLastAction();
    setToast(null);
  }, [clearLastAction]);

  const getStatusForToday = (subjectId: string) => {
    return records.find((r) => r.subjectId === subjectId && r.date === dateStr)?.status;
  };

  // Swipe handlers
  const onPointerDown = (e: React.PointerEvent, subjectId: string) => {
    // Prevent swiping if subject is already marked today
    if (getStatusForToday(subjectId)) return;

    const currentOffset = snappedLeft[subjectId] ? -200 : 0;
    pointerStart.current = { x: e.clientX - currentOffset, y: e.clientY, id: subjectId };
    isSwipingRef.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const subjectId = pointerStart.current.id;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    
    // Determine if horizontal swipe (vs vertical scroll)
    if (!isSwipingRef.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      isSwipingRef.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    if (isSwipingRef.current) {
      e.preventDefault();
      // Clamp offsets: swipe right goes up to 150px, swipe left goes down to -240px
      const clamped = dx > 0 ? Math.min(150, dx) : Math.max(-240, dx);
      setSwipeOffsets(prev => ({ ...prev, [subjectId]: clamped }));
    }
  };

  const onPointerUp = (e: React.PointerEvent, subjectId: string, slotTime: string) => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;

    if (isSwipingRef.current) {
      if (dx > 80) {
        // Swipe right → Mark Present
        handleMark(subjectId, 'present', slotTime);
        setSwipeOffsets(prev => ({ ...prev, [subjectId]: 0 }));
        setSnappedLeft(prev => ({ ...prev, [subjectId]: false }));
      } else if (dx < -60) {
        // Swipe left → Snap open to -200px to reveal Absent & Cancelled buttons
        setSwipeOffsets(prev => ({ ...prev, [subjectId]: -200 }));
        setSnappedLeft(prev => ({ ...prev, [subjectId]: true }));
      } else {
        // Snap back to closest state depending on where we were
        if (snappedLeft[subjectId]) {
          if (dx > -80) {
            // Dragged back to the right → Snap closed
            setSwipeOffsets(prev => ({ ...prev, [subjectId]: 0 }));
            setSnappedLeft(prev => ({ ...prev, [subjectId]: false }));
          } else {
            // Keep snapped open
            setSwipeOffsets(prev => ({ ...prev, [subjectId]: -200 }));
          }
        } else {
          // Snap closed
          setSwipeOffsets(prev => ({ ...prev, [subjectId]: 0 }));
        }
      }
    } else {
      // Tap detected. If card was snapped open, tap to close it
      if (snappedLeft[subjectId]) {
        setSwipeOffsets(prev => ({ ...prev, [subjectId]: 0 }));
        setSnappedLeft(prev => ({ ...prev, [subjectId]: false }));
      }
    }

    pointerStart.current = null;
    isSwipingRef.current = false;
  };

  if (settings.holidayMode) {
    return (
      <div className="bg-blue-500/10 rounded-2xl p-10 text-center border border-blue-500/30">
        <div className="bg-blue-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <p className="text-blue-400 font-bold">Holiday Mode Active</p>
        <p className="text-slate-500 text-xs mt-1 leading-relaxed">
          Enjoy your break! Notifications and class reminders are currently paused.
        </p>
      </div>
    );
  }

  if (todayClasses.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 border-dashed">
        <div className="bg-slate-100 dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-slate-400 dark:text-slate-400 font-medium">No classes scheduled for today.</p>
        <p className="text-slate-500 dark:text-slate-600 text-xs mt-1">Check your dashboard to see all subjects.</p>
      </div>
    );
  }

  return (
    <>
      {/* Swipe hint */}
      <div className="text-center mb-4">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
          ← Swipe right for Present • Swipe left for Absent/Cancelled →
        </p>
      </div>

      <div className="space-y-4">
        {todayClasses.map((subject) => {
          const currentStatus = getStatusForToday(subject.id);
          const slotInfo = subject.schedule.find(s => Number(s.day) === today);
          const slotTime = slotInfo?.slot || '09:00';
          const safety = getBunkSafety(subject);
          const offset = swipeOffsets[subject.id] || (snappedLeft[subject.id] ? -200 : 0);
          
          return (
            <div key={subject.id} className="relative overflow-hidden rounded-2xl select-none">
              {/* Background actions revealed on swipe */}
              <div className="absolute inset-0 flex">
                {/* Right swipe background (Present) */}
                <div 
                  className={`flex items-center justify-start pl-6 w-1/2 transition-opacity duration-200 ${offset > 20 ? 'opacity-100' : 'opacity-0'}`}
                  style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}
                >
                  <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest">
                    <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Present
                  </div>
                </div>

                {/* Left swipe background (Absent & Cancelled options) */}
                <div 
                  className={`flex items-center justify-end pr-3 gap-2 w-full transition-opacity duration-200 ${offset < -20 ? 'opacity-100' : 'opacity-0'}`}
                  style={{ background: 'linear-gradient(270deg, #ef4444, #f97316)' }}
                >
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleMark(subject.id, 'absent', slotTime);
                    }}
                    className="bg-white hover:bg-slate-100 text-red-600 font-black text-xs uppercase px-3.5 py-2 rounded-xl shadow-lg border border-white/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Absent</span>
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await handleMark(subject.id, 'cancelled', slotTime);
                    }}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-black text-xs uppercase px-3.5 py-2 rounded-xl shadow-lg border border-white/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Cancelled</span>
                  </button>
                </div>
              </div>

              {/* Main card (swipeable) */}
              <div 
                aria-label={"Mark attendance for " + subject.name}
                className="bg-slate-50 dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-md dark:shadow-lg relative cursor-grab active:cursor-grabbing"
                style={{ 
                  transform: `translateX(${offset}px)`,
                  transition: offset === 0 || offset === -200 ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                  touchAction: 'pan-y'
                }}
                onPointerDown={(e) => onPointerDown(e, subject.id)}
                onPointerMove={onPointerMove}
                onPointerUp={(e) => onPointerUp(e, subject.id, slotTime)}
                onPointerCancel={() => {
                  setSwipeOffsets(prev => ({ ...prev, [subject.id]: 0 }));
                  setSnappedLeft(prev => ({ ...prev, [subject.id]: false }));
                  pointerStart.current = null;
                  isSwipingRef.current = false;
                }}
              >
                {/* Safety Badge */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${safety.color.split(' ')[0]}`}></div>
                
                {/* Keyboard/Screen Reader Fallbacks */}
                {!currentStatus && (
                  <div className="sr-only">
                    <button
                      onClick={async () => await handleMark(subject.id, 'present', slotTime)}
                      aria-label={`Mark ${subject.name} as Present`}
                    >
                      Mark Present
                    </button>
                    <button
                      onClick={async () => await handleMark(subject.id, 'absent', slotTime)}
                      aria-label={`Mark ${subject.name} as Absent`}
                    >
                      Mark Absent
                    </button>
                    <button
                      onClick={async () => await handleMark(subject.id, 'cancelled', slotTime)}
                      aria-label={`Mark ${subject.name} as Cancelled`}
                    >
                      Mark Cancelled
                    </button>
                  </div>
                )}

                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-lg truncate text-slate-900 dark:text-white">{subject.name}</h4>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${safety.color}`}>
                      {safety.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-tighter">
                      {slotTime}
                    </span>
                    <span className="text-slate-500 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                      {subject.labMultiplier === 2 ? 'Lab Session' : 'Theory'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  {currentStatus ? (
                    /* ALREADY MARKED: Show gorgeous status badge + Reset button */
                    <div className="flex items-center gap-2">
                      {currentStatus === 'present' && (
                        <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-500 text-xs font-black uppercase tracking-wider px-3.5 py-2 rounded-xl border border-green-500/20 shadow-sm">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          Present
                        </span>
                      )}
                      {currentStatus === 'absent' && (
                        <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 text-xs font-black uppercase tracking-wider px-3.5 py-2 rounded-xl border border-red-500/20 shadow-sm">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Absent
                        </span>
                      )}
                      {currentStatus === 'cancelled' && (
                        <span className="inline-flex items-center gap-1 bg-slate-500/10 text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-wider px-3.5 py-2 rounded-xl border border-slate-500/20 shadow-sm">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          Cancelled
                        </span>
                      )}
                      
                      {/* Elegant circular reset/clear button */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const todayRecord = records.find(r => r.subjectId === subject.id && r.date === dateStr);
                          if (todayRecord) {
                            await unmarkAttendance(todayRecord.id);
                          }
                        }}
                        aria-label="Clear attendance"
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 transition-colors shadow-sm active:scale-90"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    /* UNMARKED: Show elegant pulsing swipe instruction badge */
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2.5 rounded-xl select-none shadow-inner border border-slate-200/20">
                      <span className="text-[9px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">Swipe</span>
                      <svg className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M8 9l3 3-3 3M16 9l3 3-3 3" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Undo Toast */}
      {toast && (
        <UndoToast
          subjectName={toast.subjectName}
          status={toast.status}
          onUndo={handleUndo}
          onDismiss={handleDismissToast}
        />
      )}

      {/* AppModal fallback for Class Not Started alert */}
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
    </>
  );
};

export default TodayList;

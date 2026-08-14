import { create } from 'zustand';
import type { AttendanceRecord } from '../lib/types';
import { saveToStorage, getFromStorage } from '../lib/storage';
import { handleAttendanceAlerts } from '../lib/notifications';
import { useSubjects } from './useSubjects';
import { useSettings } from './useSettings';

interface LastAction {
  record: AttendanceRecord;
  previousRecord: AttendanceRecord | null; // null if no prior record for that subject+date
}

interface AttendanceState {
  records: AttendanceRecord[];
  lastAction: LastAction | null;
  markAttendance: (record: AttendanceRecord) => Promise<void>;
  unmarkAttendance: (id: string) => Promise<void>;
  undoLastAction: () => Promise<void>;
  clearLastAction: () => void;
  loadRecords: () => Promise<void>;
  getStreak: () => number;
}

export const useAttendance = create<AttendanceState>((set, get) => ({
  records: [],
  lastAction: null,
  markAttendance: async (record) => {
    const oldRecords = get().records;
    const previousRecord = oldRecords.find(
      r => r.subjectId === record.subjectId && r.date === record.date
    ) || null;
    const filtered = oldRecords.filter(r => !(r.subjectId === record.subjectId && r.date === record.date));
    const newRecords = [...filtered, record];
    
    set({ 
      records: newRecords,
      lastAction: { record, previousRecord }
    });
    await saveToStorage('attendance_records', newRecords);

    // Advanced Notifications logic
    const subject = useSubjects.getState().subjects.find(s => s.id === record.subjectId);
    if (subject) {
      await handleAttendanceAlerts(
        subject, 
        oldRecords, 
        newRecords, 
        useSettings.getState().settings
      );
    }
  },
  unmarkAttendance: async (id) => {
    const oldRecords = get().records;
    const record = oldRecords.find(r => r.id === id);
    const newRecords = oldRecords.filter((r) => r.id !== id);
    
    set({ records: newRecords });
    await saveToStorage('attendance_records', newRecords);

    if (record) {
      const subject = useSubjects.getState().subjects.find(s => s.id === record.subjectId);
      if (subject) {
        await handleAttendanceAlerts(
          subject, 
          oldRecords, 
          newRecords, 
          useSettings.getState().settings
        );
      }
    }
  },
  undoLastAction: async () => {
    const { lastAction, records } = get();
    if (!lastAction) return;

    const { record, previousRecord } = lastAction;
    // Remove the action we just took
    let newRecords = records.filter(
      r => !(r.subjectId === record.subjectId && r.date === record.date)
    );
    // Restore the previous record if one existed
    if (previousRecord) {
      newRecords = [...newRecords, previousRecord];
    }

    set({ records: newRecords, lastAction: null });
    await saveToStorage('attendance_records', newRecords);
  },
  clearLastAction: () => {
    set({ lastAction: null });
  },
  loadRecords: async () => {
    const stored = await getFromStorage<AttendanceRecord[]>('attendance_records');
    if (stored) set({ records: stored });
  },
  getStreak: () => {
    const { records } = get();
    const subjects = useSubjects.getState().subjects;
    if (subjects.length === 0 || records.length === 0) return 0;

    // Walk backwards from today counting consecutive days where ALL scheduled classes were 'present' (skip 'cancelled')
    const now = new Date();
    let streak = 0;

    for (let daysBack = 0; daysBack < 365; daysBack++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() - daysBack);
      const dayOfWeek = checkDate.getDay();
      const dateStr = checkDate.toLocaleDateString('en-CA');

      // Find subjects scheduled for this day
      const scheduledSubjects = subjects.filter(s =>
        s.schedule.some(slot => Number(slot.day) === dayOfWeek)
      );

      // No classes scheduled → skip this day (don't break streak)
      if (scheduledSubjects.length === 0) continue;

      // Check attendance for each scheduled subject on this date
      const dayRecords = records.filter(r => r.date === dateStr);
      
      // If no records at all for today (today might not have started yet)
      if (dayRecords.length === 0) {
        if (daysBack === 0) continue; // Today hasn't been marked yet, skip
        break; // Past day with no records = missed
      }

      let hasAbsent = false;
      let hasPresent = false;
      let unmarkedCount = 0;

      for (const sub of scheduledSubjects) {
        const rec = dayRecords.find(r => r.subjectId === sub.id);
        if (!rec) {
          unmarkedCount++;
        } else if (rec.status === 'absent') {
          hasAbsent = true;
          break;
        } else if (rec.status === 'present') {
          hasPresent = true;
        }
      }

      if (hasAbsent) break;

      if (daysBack === 0) {
        if (hasPresent && unmarkedCount === 0) {
          streak++;
        }
        continue;
      }

      if (unmarkedCount > 0) break;
      streak++;
    }

    return streak;
  },
}));

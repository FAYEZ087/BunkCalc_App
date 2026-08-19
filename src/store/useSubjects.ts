import { create } from 'zustand';
import type { Subject } from '../lib/types';
import { saveToStorage, getFromStorage } from '../lib/storage';

interface SubjectsState {
  subjects: Subject[];
  addSubject: (subject: Subject) => void;
  updateSubject: (subject: Subject) => void;
  deleteSubject: (id: string) => void;
  loadSubjects: () => Promise<void>;
}

export const useSubjects = create<SubjectsState>((set, get) => ({
  subjects: [],
  addSubject: async (subject) => {
    const newSubjects = [...get().subjects, subject];
    set({ subjects: newSubjects });
    await saveToStorage('subjects', newSubjects);

    try {
      const { scheduleDailyClassReminders } = await import('../lib/notifications');
      const { useAttendance } = await import('./useAttendance');
      const { useSettings } = await import('./useSettings');
      await scheduleDailyClassReminders(newSubjects, useSettings.getState().settings, useAttendance.getState().records);
    } catch (err) {
      console.error('Failed to reschedule notifications after adding subject:', err);
    }
  },
  updateSubject: async (subject) => {
    const newSubjects = get().subjects.map((s) => (s.id === subject.id ? subject : s));
    set({ subjects: newSubjects });
    await saveToStorage('subjects', newSubjects);

    try {
      const { scheduleDailyClassReminders } = await import('../lib/notifications');
      const { useAttendance } = await import('./useAttendance');
      const { useSettings } = await import('./useSettings');
      await scheduleDailyClassReminders(newSubjects, useSettings.getState().settings, useAttendance.getState().records);
    } catch (err) {
      console.error('Failed to reschedule notifications after updating subject:', err);
    }
  },
  deleteSubject: async (id) => {
    const newSubjects = get().subjects.filter((s) => s.id !== id);
    set({ subjects: newSubjects });
    await saveToStorage('subjects', newSubjects);
    
    try {
      const { cancelSubjectNotifications, scheduleDailyClassReminders } = await import('../lib/notifications');
      await cancelSubjectNotifications(id);
      const { useAttendance } = await import('./useAttendance');
      const { useSettings } = await import('./useSettings');
      await scheduleDailyClassReminders(newSubjects, useSettings.getState().settings, useAttendance.getState().records);
    } catch (err) {
      console.error('Failed to cancel notifications:', err);
    }

    try {
      const { useAttendance } = await import('./useAttendance');
      const attendanceRecords = useAttendance.getState().records;
      const remainingRecords = attendanceRecords.filter(r => r.subjectId !== id);
      useAttendance.setState({ records: remainingRecords });
      await saveToStorage('attendance_records', remainingRecords);
    } catch (err) {
      console.error('Failed to cleanup attendance records:', err);
    }
  },
  loadSubjects: async () => {
    const stored = await getFromStorage<Subject[]>('subjects');
    if (stored) set({ subjects: stored });
  },
}));

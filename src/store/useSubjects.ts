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
  addSubject: (subject) => {
    set((state) => {
      const newSubjects = [...state.subjects, subject];
      saveToStorage('subjects', newSubjects);
      return { subjects: newSubjects };
    });
  },
  updateSubject: (subject) => {
    set((state) => {
      const newSubjects = state.subjects.map((s) => (s.id === subject.id ? subject : s));
      saveToStorage('subjects', newSubjects);
      return { subjects: newSubjects };
    });
  },
  deleteSubject: async (id) => {
    const newSubjects = get().subjects.filter((s) => s.id !== id);
    set({ subjects: newSubjects });
    await saveToStorage('subjects', newSubjects);
    
    try {
      const { cancelSubjectNotifications } = await import('../lib/notifications');
      await cancelSubjectNotifications(id);
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

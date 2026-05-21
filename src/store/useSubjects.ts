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

export const useSubjects = create<SubjectsState>((set) => ({
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
  deleteSubject: (id) => {
    set((state) => {
      const newSubjects = state.subjects.filter((s) => s.id !== id);
      saveToStorage('subjects', newSubjects);
      
      // Clean up notifications and attendance records asynchronously to avoid circular dependency
      import('../lib/notifications').then(({ cancelSubjectNotifications }) => {
        cancelSubjectNotifications(id).catch(err => console.error('Failed to cancel notifications:', err));
      });
      
      import('./useAttendance').then(({ useAttendance }) => {
        const attendanceRecords = useAttendance.getState().records;
        const remainingRecords = attendanceRecords.filter(r => r.subjectId !== id);
        useAttendance.setState({ records: remainingRecords });
        saveToStorage('attendance_records', remainingRecords);
      });

      return { subjects: newSubjects };
    });
  },
  loadSubjects: async () => {
    const stored = await getFromStorage<Subject[]>('subjects');
    if (stored) set({ subjects: stored });
  },
}));

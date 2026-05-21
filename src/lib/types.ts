export type AttendanceStatus = 'present' | 'absent' | 'cancelled';

export interface ScheduleSlot {
  day: number; // 0-6 (Sun-Sat)
  slot: string; // "09:00"
}

export interface Subject {
  id: string;
  name: string;
  credits: number;
  threshold: number;
  schedule: ScheduleSlot[];
  labMultiplier: 1 | 2;
}

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  date: string; // ISO "2026-05-20"
  status: AttendanceStatus;
}

export interface ArchivedSemester {
  id: string;
  name: string;
  endDate: string;
  archivedAt: string;
  subjects: Subject[];
  records: AttendanceRecord[];
  overallPct: number;
}

export interface AppSettings {
  semesterEndDate: string;
  globalThreshold: number;
  warningBuffer: number;
  notificationsEnabled: boolean;
  reminderMinutesBefore: 5 | 10 | 15 | 30;
  holidayMode: boolean;
  hapticsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}


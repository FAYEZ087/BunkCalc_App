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
  isLab?: boolean;
  attendedSoFar?: number; // past sessions attended before app install (default 0)
  missedSoFar?: number;   // past sessions missed before app install (default 0)
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

export interface Holiday {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export type ThemeMode = 'light' | 'dark' | 'oled' | 'system';
export type ThemeAccent = 'blue' | 'purple' | 'emerald' | 'amber' | 'rose';

export interface AppSettings {
  semesterEndDate: string;
  globalThreshold: number;
  warningBuffer: number;
  notificationsEnabled: boolean;
  preClassReminder?: boolean;
  postClassReminder?: boolean;
  sundaySummaryNotification?: boolean;
  reminderMinutesBefore: 5 | 10 | 15 | 30;
  holidayMode: boolean;
  hapticsEnabled: boolean;
  theme: ThemeMode;
  themeAccent?: ThemeAccent;
  holidays?: Holiday[];
}


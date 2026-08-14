import { create } from 'zustand';
import type { AppSettings, ArchivedSemester, Holiday } from '../lib/types';
import { saveToStorage, getFromStorage } from '../lib/storage';

interface SettingsState {
  settings: AppSettings;
  archivedSemesters: ArchivedSemester[];
  setSettings: (settings: AppSettings) => void;
  addHoliday: (holiday: Holiday) => void;
  deleteHoliday: (id: string) => void;
  loadSettings: () => Promise<void>;
  loadArchivedSemesters: () => Promise<void>;
  archiveSemester: (semester: ArchivedSemester) => Promise<void>;
  deleteArchivedSemester: (id: string) => Promise<void>;
}

const defaultSettings: AppSettings = {
  semesterEndDate: `${new Date().getFullYear()}-12-31`,
  globalThreshold: 0.75,
  warningBuffer: 0.05,
  notificationsEnabled: true,
  preClassReminder: true,
  postClassReminder: true,
  sundaySummaryNotification: true,
  reminderMinutesBefore: 10,
  holidayMode: false,
  hapticsEnabled: true,
  theme: 'dark',
  themeAccent: 'blue',
  holidays: [],
};

export const useSettings = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  archivedSemesters: [],
  setSettings: (settings) => {
    set({ settings });
    saveToStorage('app_settings', settings);
    applyTheme(settings.theme, settings.themeAccent);
  },
  addHoliday: (holiday) => {
    const currentSettings = get().settings;
    const currentHolidays = currentSettings.holidays || [];
    const updatedSettings: AppSettings = {
      ...currentSettings,
      holidays: [...currentHolidays, holiday],
    };
    set({ settings: updatedSettings });
    saveToStorage('app_settings', updatedSettings);
  },
  deleteHoliday: (id) => {
    const currentSettings = get().settings;
    const currentHolidays = currentSettings.holidays || [];
    const updatedSettings: AppSettings = {
      ...currentSettings,
      holidays: currentHolidays.filter((h) => h.id !== id),
    };
    set({ settings: updatedSettings });
    saveToStorage('app_settings', updatedSettings);
  },
  loadSettings: async () => {
    const stored = await getFromStorage<AppSettings>('app_settings');
    if (stored) {
      const merged = { ...defaultSettings, ...stored, holidays: stored.holidays || [] };
      set({ settings: merged });
      applyTheme(merged.theme, merged.themeAccent);
    } else {
      applyTheme(defaultSettings.theme, defaultSettings.themeAccent);
    }
  },
  loadArchivedSemesters: async () => {
    const stored = await getFromStorage<ArchivedSemester[]>('archived_semesters');
    if (stored) set({ archivedSemesters: stored });
  },
  archiveSemester: async (semester) => {
    const current = get().archivedSemesters;
    const updated = [...current, semester];
    set({ archivedSemesters: updated });
    await saveToStorage('archived_semesters', updated);
  },
  deleteArchivedSemester: async (id) => {
    const current = get().archivedSemesters;
    const updated = current.filter(s => s.id !== id);
    set({ archivedSemesters: updated });
    await saveToStorage('archived_semesters', updated);
  },
}));

function applyTheme(theme: 'light' | 'dark' | 'oled' | 'system', accent: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' = 'blue') {
  const root = window.document.documentElement;
  const isDark = theme === 'dark' || theme === 'oled' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const isOled = theme === 'oled';
  
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  if (isOled) {
    root.classList.add('oled');
  } else {
    root.classList.remove('oled');
  }

  root.classList.remove('accent-blue', 'accent-purple', 'accent-emerald', 'accent-amber', 'accent-rose');
  root.classList.add(`accent-${accent || 'blue'}`);
}

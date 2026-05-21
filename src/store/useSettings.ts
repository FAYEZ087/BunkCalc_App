import { create } from 'zustand';
import type { AppSettings, ArchivedSemester } from '../lib/types';
import { saveToStorage, getFromStorage } from '../lib/storage';

interface SettingsState {
  settings: AppSettings;
  archivedSemesters: ArchivedSemester[];
  setSettings: (settings: AppSettings) => void;
  loadSettings: () => Promise<void>;
  loadArchivedSemesters: () => Promise<void>;
  archiveSemester: (semester: ArchivedSemester) => Promise<void>;
  deleteArchivedSemester: (id: string) => Promise<void>;
}

const defaultSettings: AppSettings = {
  semesterEndDate: new Date(new Date().getFullYear(), 11, 31).toISOString(),
  globalThreshold: 0.75,
  warningBuffer: 0.05,
  notificationsEnabled: true,
  reminderMinutesBefore: 10,
  holidayMode: false,
  hapticsEnabled: true,
  theme: 'dark',
};

export const useSettings = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  archivedSemesters: [],
  setSettings: (settings) => {
    set({ settings });
    saveToStorage('app_settings', settings);
    applyTheme(settings.theme);
  },
  loadSettings: async () => {
    const stored = await getFromStorage<AppSettings>('app_settings');
    if (stored) {
      set({ settings: stored });
      applyTheme(stored.theme);
    } else {
      applyTheme(defaultSettings.theme);
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

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = window.document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

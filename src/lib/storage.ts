import { Preferences } from '@capacitor/preferences';
import { validateImportPayload } from './validation';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { calculateSubjectStats } from './calculations';
import type { Subject, AttendanceRecord } from './types';

const STORAGE_VERSION = 3;

export const saveToStorage = async (key: string, value: any) => {
  await Preferences.set({
    key,
    value: JSON.stringify(value),
  });
};

export const getFromStorage = async <T>(key: string): Promise<T | null> => {
  const { value } = await Preferences.get({ key });
  return value ? JSON.parse(value) : null;
};

export const removeFromStorage = async (key: string) => {
  await Preferences.remove({ key });
};

export const clearAllStorage = async () => {
  await Preferences.clear();
};

/**
 * Run on app startup to migrate storage schema if needed.
 * Ensures backward compatibility when new storage keys are introduced.
 */
export const migrateStorageIfNeeded = async () => {
  const version = await getFromStorage<number>('storage_version');

  if (!version || version < 2) {
    // v1 → v2: Initialize archived_semesters if missing
    const existing = await getFromStorage('archived_semesters');
    if (!existing) {
      await saveToStorage('archived_semesters', []);
    }
  }

  if (!version || version < 3) {
    // v2 → v3: Patch subjects with default attendedSoFar: 0 and missedSoFar: 0 if undefined
    const storedSubjects = await getFromStorage<any[]>('subjects');
    if (storedSubjects && Array.isArray(storedSubjects)) {
      const patchedSubjects = storedSubjects.map((s) => ({
        ...s,
        attendedSoFar: s.attendedSoFar ?? 0,
        missedSoFar: s.missedSoFar ?? 0,
      }));
      await saveToStorage('subjects', patchedSubjects);
    }
    await saveToStorage('storage_version', STORAGE_VERSION);
  }
};

export const exportAppState = async () => {
  const subjects = await getFromStorage('subjects');
  const attendance = await getFromStorage('attendance_records');
  const settings = await getFromStorage('app_settings');
  const archived = await getFromStorage('archived_semesters');

  const data = {
    subjects,
    attendance,
    settings,
    archived_semesters: archived,
    exportedAt: new Date().toISOString(),
    version: '2.0.0'
  };

  const fileName = `bunkcalc_backup_${new Date().toLocaleDateString('en-CA')}.json`;

  if (Capacitor.isNativePlatform()) {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const base64Data = btoa(unescape(encodeURIComponent(jsonStr)));
      
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: 'BunkCalc Backup',
        text: 'My BunkCalc Attendance Backup file.',
        files: [savedFile.uri],
        dialogTitle: 'Save BunkCalc Backup',
      });
      return;
    } catch (err) {
      console.error('Native app backup share failed, falling back to web download:', err);
    }
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importAppState = async (file: File): Promise<any> => {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File size exceeds 5 MB limit.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const rawText = e.target?.result as string;
        const data = JSON.parse(rawText);
        
        const validated = validateImportPayload(data);
        if (!validated.valid || !validated.data) {
          throw new Error(validated.error || "Invalid import file format.");
        }
        
        const cleanData = validated.data;
        if (cleanData.subjects) await saveToStorage('subjects', cleanData.subjects);
        if (cleanData.attendance) await saveToStorage('attendance_records', cleanData.attendance);
        if (cleanData.settings) await saveToStorage('app_settings', cleanData.settings);
        if (cleanData.archived_semesters) await saveToStorage('archived_semesters', cleanData.archived_semesters);
        
        resolve(cleanData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const exportToCSV = async () => {
  const subjects = (await getFromStorage<Subject[]>('subjects')) || [];
  const attendance = (await getFromStorage<AttendanceRecord[]>('attendance_records')) || [];
  
  const header = 'Date,Subject,Status,Credits';
  const rows = [...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => {
    const subject = subjects.find(s => s.id === record.subjectId);
    const subjectName = subject ? subject.name : 'Unknown';
    const credits = subject ? subject.credits : 0;
    return `${record.date},${subjectName},${record.status},${credits}`;
  });
  
  const csvContent = [header, ...rows].join('\n');
  const fileName = `bunkcalc_attendance_${new Date().toLocaleDateString('en-CA')}.csv`;
  
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = btoa(unescape(encodeURIComponent(csvContent)));
      
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title: 'BunkCalc CSV Report',
        text: 'My BunkCalc Attendance Report.',
        files: [savedFile.uri],
        dialogTitle: 'Save BunkCalc CSV',
      });
      return;
    } catch (err) {
      console.error('Native app CSV share failed, falling back to web download:', err);
    }
  }

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToPDF = async () => {
  const subjects = (await getFromStorage<Subject[]>('subjects')) || [];
  const attendance = (await getFromStorage<AttendanceRecord[]>('attendance_records')) || [];
  
  let html = `
    <html>
      <head>
        <title>BunkCalc Attendance Report</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; }
          .date { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f8f9fa; }
        </style>
      </head>
      <body>
        <h1>BunkCalc Attendance Report</h1>
        <div class="date">Generated on ${new Date().toLocaleDateString()}</div>
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Attended / Total</th>
              <th>Percentage</th>
              <th>Bunk Budget</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  subjects.forEach(subject => {
    const stats = calculateSubjectStats(subject, attendance);
    html += `
      <tr>
        <td>${subject.name}</td>
        <td>${stats.attendedCount} / ${stats.totalClasses}</td>
        <td>${stats.attendancePct.toFixed(1)}%</td>
        <td>${stats.safeBunks > 0 ? stats.safeBunks : 0}</td>
      </tr>
    `;
  });
  
  html += `
          </tbody>
        </table>
      </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
};


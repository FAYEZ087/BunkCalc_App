import React, { useState } from 'react';
import { useSettings } from '../store/useSettings';
import { useSubjects } from '../store/useSubjects';
import { useAttendance } from '../store/useAttendance';
import { exportAppState, importAppState, clearAllStorage, saveToStorage } from '../lib/storage';
import LegalModal from '../components/LegalModal';
import { v4 as uuidv4 } from 'uuid';
import type { ArchivedSemester } from '../lib/types';
import { calculateSubjectStats } from '../lib/calculations';
import { AppModal } from '../components/AppModal';
import { sanitizeName, validateArchiveName } from '../lib/validation';
import { ensureNotificationPermission } from '../lib/permissions';

import { Share } from '@capacitor/share';

const Settings: React.FC = () => {
  const { settings, setSettings, archivedSemesters, archiveSemester, deleteArchivedSemester } = useSettings();
  const { subjects, deleteSubject } = useSubjects();
  const { records } = useAttendance();
  const [legal, setLegal] = useState<{ title: string; type: 'privacy' | 'terms' } | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveName, setArchiveName] = useState('');
  const [showArchivedList, setShowArchivedList] = useState(false);

  // AppModal State
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'error' | 'alert' | 'success' | 'confirm';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const handleRequestPermission = async () => {
    const granted = await ensureNotificationPermission();
    if (granted) {
      setModal({
        isOpen: true,
        title: "Success",
        message: "Notifications enabled successfully!",
        type: "success",
        confirmText: "OK",
        onConfirm: () => setModal(null)
      });
    } else {
      setModal({
        isOpen: true,
        title: "Permission Denied",
        message: "Permission denied. Please enable notifications in your phone settings.",
        type: "error",
        confirmText: "OK",
        onConfirm: () => setModal(null)
      });
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'BunkCalc: Attendance Tracker',
        text: 'Manage your bunks like a pro with BunkCalc! Track attendance, set alerts, and stay safe.',
        url: 'https://bunkcalc.app', // Placeholder URL
        dialogTitle: 'Share with Friends',
      });
    } catch (err) {
      console.log('Sharing failed', err);
    }
  };

  const handleFeedback = () => {
    window.location.href = 'mailto:support@bunkcalc.app?subject=BunkCalc Feedback v2.0.0';
  };

  const handleRate = () => {
    setModal({
      isOpen: true,
      title: "Coming Soon",
      message: "Thank you for your support! App store links will be active in the production release.",
      type: "alert",
      confirmText: "OK",
      onConfirm: () => setModal(null)
    });
  };

  const handleDeleteSubject = (id: string, name: string) => {
    setModal({
      isOpen: true,
      title: "Delete Subject",
      message: `Are you sure you want to delete ${name}? All attendance records for this subject will be lost.`,
      type: "confirm",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: () => {
        deleteSubject(id);
        setModal(null);
      },
      onCancel: () => setModal(null)
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setModal({
        isOpen: true,
        title: "Overwrite Data",
        message: "Importing data will overwrite your current settings and attendance. Continue?",
        type: "confirm",
        confirmText: "Overwrite",
        cancelText: "Cancel",
        onConfirm: async () => {
          setModal(null);
          try {
            await importAppState(file);
            setModal({
              isOpen: true,
              title: "Data Restored",
              message: "Data restored successfully! Please restart the app.",
              type: "success",
              confirmText: "OK",
              onConfirm: () => {
                setModal(null);
                window.location.reload();
              }
            });
          } catch (err: any) {
            setModal({
              isOpen: true,
              title: "Import Failed",
              message: err.message || "Failed to import data. Please ensure the file is a valid BunkCalc backup.",
              type: "error",
              confirmText: "OK",
              onConfirm: () => setModal(null)
            });
          }
        },
        onCancel: () => setModal(null)
      });
    }
  };

  const handleReset = async () => {
    setModal({
      isOpen: true,
      title: "Factory Reset",
      message: "⚠️ This will permanently delete ALL your subjects, attendance records, and settings. This action cannot be undone.\n\nAre you sure you want to reset?",
      type: "confirm",
      confirmText: "Reset",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await clearAllStorage();
          window.location.reload();
        } catch (err) {
          setModal({
            isOpen: true,
            title: "Reset Failed",
            message: "Failed to reset app data. Please try again.",
            type: "error",
            confirmText: "OK",
            onConfirm: () => setModal(null)
          });
        }
      },
      onCancel: () => setModal(null)
    });
  };

  const handleArchiveSemester = async () => {
    const sanitized = sanitizeName(archiveName);
    const validation = validateArchiveName(sanitized);
    if (!validation.valid) {
      setModal({
        isOpen: true,
        title: "Archive Failed",
        message: validation.error || "Please enter a valid semester name.",
        type: "error",
        confirmText: "OK",
        onConfirm: () => setModal(null)
      });
      return;
    }
    if (subjects.length === 0) {
      setModal({
        isOpen: true,
        title: "Archive Failed",
        message: "No subjects to archive.",
        type: "error",
        confirmText: "OK",
        onConfirm: () => setModal(null)
      });
      return;
    }

    const totalAttended = subjects.reduce((acc, s) => acc + calculateSubjectStats(s, records).attendedCount, 0);
    const totalClasses = subjects.reduce((acc, s) => acc + calculateSubjectStats(s, records).totalClasses, 0);
    const overallPct = totalClasses === 0 ? 100 : (totalAttended / totalClasses) * 100;

    const archived: ArchivedSemester = {
      id: uuidv4(),
      name: sanitized,
      endDate: settings.semesterEndDate,
      archivedAt: new Date().toISOString(),
      subjects: [...subjects],
      records: [...records],
      overallPct,
    };

    await archiveSemester(archived);
    // Clear current subjects and records
    await saveToStorage('subjects', []);
    await saveToStorage('attendance_records', []);
    setShowArchiveModal(false);
    setArchiveName('');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-6 pb-24">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <section className="mb-8">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Academic</h2>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <p className="font-bold text-sm">Attendance Threshold</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Minimum required percentage</p>
            </div>
            <select 
              value={Math.round(settings.globalThreshold * 100)}
              onChange={(e) => setSettings({ ...settings, globalThreshold: Number(e.target.value) / 100 })}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
            >
              {[60, 65, 70, 75, 80, 85, 90].map(val => (
                <option key={val} value={val}>{val}%</option>
              ))}
            </select>
          </div>

          <div className="p-4 flex justify-between items-center">
            <div>
              <p className="font-bold text-sm">Danger Zone Buffer</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Alert threshold above minimum</p>
            </div>
            <select 
              value={Math.round(settings.warningBuffer * 100)}
              onChange={(e) => setSettings({ ...settings, warningBuffer: Number(e.target.value) / 100 })}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
            >
              {[2, 3, 5, 7, 10].map(val => (
                <option key={val} value={val}>{val}%</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Notifications</h2>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <p className="font-bold text-sm">Push Notifications</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Class reminders and alerts</p>
            </div>
            <button 
              onClick={() => setSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.notificationsEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.notificationsEnabled ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          {settings.notificationsEnabled && (
            <>
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">Class Reminders</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Minutes before class starts</p>
                </div>
                <select 
                  value={settings.reminderMinutesBefore}
                  onChange={(e) => setSettings({ ...settings, reminderMinutesBefore: Number(e.target.value) as 5 | 10 | 15 | 30 })}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                >
                  <option value={5}>5 mins</option>
                  <option value={10}>10 mins</option>
                  <option value={15}>15 mins</option>
                  <option value={30}>30 mins</option>
                </select>
              </div>

              <div className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">Holiday Mode</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pause reminders during breaks</p>
                </div>
                <button 
                  onClick={() => setSettings({ ...settings, holidayMode: !settings.holidayMode })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings.holidayMode ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.holidayMode ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="p-4 bg-blue-500/5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm text-blue-600 dark:text-blue-400">System Permissions</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">Required for alerts to work</p>
                </div>
                <button 
                  onClick={handleRequestPermission}
                  className="bg-blue-600 text-white text-[10px] font-black uppercase px-3 py-2 rounded-lg shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                  Request Access
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Interaction</h2>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <p className="font-bold text-sm">Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">App appearance mode</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSettings({ ...settings, theme: t })}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    settings.theme === t 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 flex justify-between items-center">
            <div>
              <p className="font-bold text-sm">Haptic Feedback</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Subtle vibrations on interaction</p>
            </div>
            <button 
              onClick={() => setSettings({ ...settings, hapticsEnabled: !settings.hapticsEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.hapticsEnabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.hapticsEnabled ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Data Management</h2>
        <div className="grid grid-cols-3 gap-4">
          <button 
            onClick={exportAppState}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h10a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-xs font-bold text-slate-900 dark:text-white">Backup</span>
          </button>
          
          <label className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h10a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-xs font-bold text-slate-900 dark:text-white">Restore</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>

          <button 
            onClick={handleReset}
            className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-red-500/20 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xs font-bold text-red-500">Reset</span>
          </button>
        </div>

        {/* Archive Semester Button */}
        <button
          onClick={() => setShowArchiveModal(true)}
          className="w-full mt-4 bg-purple-500/10 border border-purple-500/30 p-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-purple-500/20 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <span className="text-sm font-bold text-purple-500">Archive Current Semester</span>
        </button>

        {/* Archived Semesters */}
        {archivedSemesters.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowArchivedList(!showArchivedList)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Archived Semesters ({archivedSemesters.length})</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-400 transition-transform ${showArchivedList ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showArchivedList && (
              <div className="mt-2 space-y-2">
                {archivedSemesters.map(sem => (
                  <div key={sem.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{sem.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {sem.subjects.length} subjects • {sem.records.length} records • {sem.overallPct.toFixed(1)}% overall
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Archived {new Date(sem.archivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setModal({
                          isOpen: true,
                          title: "Delete Semester",
                          message: `Are you sure you want to delete archived semester "${sem.name}"? This action cannot be undone.`,
                          type: "confirm",
                          confirmText: "Delete",
                          cancelText: "Cancel",
                          onConfirm: () => {
                            deleteArchivedSemester(sem.id);
                            setModal(null);
                          },
                          onCancel: () => setModal(null)
                        });
                      }}
                      className="text-red-500 p-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Manage Subjects</h2>
        <div className="space-y-3">
          {subjects.map((subject) => (
            <div key={subject.id} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{subject.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{subject.credits} Credits • {subject.schedule.length} classes/week</p>
              </div>
              <button 
                onClick={() => handleDeleteSubject(subject.id, subject.name)}
                className="text-red-500 p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Support & Social</h2>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <button 
            onClick={handleRate}
            className="w-full p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/20 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">Rate App</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <button 
            onClick={handleShare}
            className="w-full p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.683-1.866l-4.94-2.47a3.046 3.046 0 000-.756l4.94-2.47A3 3 0 0015 8z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">Share with Friends</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button 
            onClick={handleFeedback}
            className="w-full p-4 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-green-500/20 p-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">Send Feedback</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Legal & About</h2>
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-sm">
          <button 
            onClick={() => setLegal({ title: 'Privacy Policy', type: 'privacy' })}
            className="w-full p-4 border-b border-slate-200 dark:border-slate-800 text-left hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors font-bold text-slate-600 dark:text-slate-300"
          >
            Privacy Policy
          </button>
          <button 
            onClick={() => setLegal({ title: 'Terms of Service', type: 'terms' })}
            className="w-full p-4 border-b border-slate-200 dark:border-slate-800 text-left hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors font-bold text-slate-600 dark:text-slate-300"
          >
            Terms of Service
          </button>
          <div className="p-4 flex justify-between items-center">
            <span className="font-bold text-slate-500 dark:text-slate-400">App Version</span>
            <span className="text-slate-500 dark:text-slate-400 font-black tracking-widest uppercase text-xs">v1.1.0</span>
          </div>
        </div>
      </section>

      {legal && (
        <LegalModal 
          title={legal.title}
          type={legal.type}
          onClose={() => setLegal(null)}
        />
      )}

      <div className="mt-auto pt-8">
        <p className="text-center text-slate-400 dark:text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-1">Made for KIITians</p>
        <p className="text-center text-slate-300 dark:text-slate-800 text-[8px] font-black uppercase">© 2026 BunkCalc. All Rights Reserved.</p>
      </div>

      {/* Archive Semester Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Archive Semester</h3>
            <p className="text-xs text-slate-500 mb-6">Save your current subjects and records as a historical snapshot, then start fresh for the new semester.</p>
            <input
              type="text"
              placeholder="e.g. Semester 4, Spring 2026"
              value={archiveName}
              onChange={(e) => setArchiveName(e.target.value)}
              maxLength={50}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:border-purple-500 text-slate-900 dark:text-white mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowArchiveModal(false); setArchiveName(''); }}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveSemester}
                className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20"
              >
                Archive & Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <AppModal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.message}
          type={modal.type}
          confirmText={modal.confirmText}
          cancelText={modal.cancelText}
          onConfirm={modal.onConfirm}
          onCancel={modal.onCancel}
        />
      )}
    </div>
  );
};

export default Settings;

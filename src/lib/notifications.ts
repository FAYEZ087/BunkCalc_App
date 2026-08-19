import { LocalNotifications } from '@capacitor/local-notifications';
import type { Subject, AttendanceRecord, AppSettings } from './types';
import { calculateSubjectStats } from './calculations';
import { ensureNotificationPermission } from './permissions';

// Unique IDs for different notification types
const NOTIF_ID_DAILY_BASE = 100000;
const NOTIF_ID_POST_CLASS_BASE = 200000;
const NOTIF_ID_THRESHOLD_BASE = 300000;
const NOTIF_ID_STATUS_BASE = 400000;
const NOTIF_ID_SUNDAY_SUMMARY = 500000;

const getSubjectHash = (id: string) => {
  return Math.abs(id.split('').reduce((a, b) => { 
    a = ((a << 5) - a) + b.charCodeAt(0); 
    return a & a; 
  }, 0)) % 1000;
};

// Generate deterministic collision-free 32-bit positive integer IDs
const getReminderId = (base: number, dayOffset: number, subjectId: string, slotIndex: number) => {
  const subHash = getSubjectHash(subjectId);
  return base + (dayOffset * 10000) + (subHash * 10) + (slotIndex % 10);
};

/**
 * Register action buttons for interactive notification prompts (Present, Absent, Cancelled)
 */
export const initNotificationActionTypes = async () => {
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'ATTENDANCE_PROMPT',
          actions: [
            {
              id: 'mark_present',
              title: '✅ Present',
            },
            {
              id: 'mark_absent',
              title: '❌ Absent',
            },
            {
              id: 'mark_cancelled',
              title: '🚫 Cancelled',
            },
          ],
        },
      ],
    });
  } catch (err) {
    console.warn('Failed to register notification action types:', err);
  }
};

/**
 * 1. Upcoming Classes Reminders & Post-Class Marking Reminders
 * Schedules individual notifications for each class.
 * - If attendance is already marked for that day -> SKIP (do not send any reminder)
 * - Pre-class reminder -> sent X mins before class start
 * - Post-class prompt -> sent 10 mins AFTER class end (accounts for 1 hr theory / 2 hr lab duration)
 */
export const scheduleDailyClassReminders = async (
  subjects: Subject[],
  settings: AppSettings,
  records: AttendanceRecord[] = []
) => {
  await ensureNotificationPermission();

  // Always clear ALL previous pending daily and post-class reminders (including legacy IDs) to prevent duplicate notifications
  try {
    const pending = await LocalNotifications.getPending();
    const dailyIds = pending.notifications
      .filter(n => (n.id < NOTIF_ID_THRESHOLD_BASE || (n.id >= NOTIF_ID_DAILY_BASE && n.id < NOTIF_ID_THRESHOLD_BASE)))
      .map(n => ({ id: n.id }));
    
    if (dailyIds.length > 0) {
      await LocalNotifications.cancel({ notifications: dailyIds });
    }
  } catch (err) {
    console.warn('Failed to clear pending notifications:', err);
  }

  if (!settings.notificationsEnabled || settings.holidayMode) {
    return;
  }

  const notifications: any[] = [];
  const now = new Date();

  // Schedule reminders for the next 7 days (including today and the next 6 days)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const targetDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const targetDay = targetDate.getDay(); // 0-6 (0 is Sunday)
    const targetDateStr = targetDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format

    // Check if target date is in a holiday
    const isHoliday = settings.holidays?.some(h => targetDateStr >= h.startDate && targetDateStr <= h.endDate);
    if (isHoliday) continue;

    for (const subject of subjects) {
      // RULE: If attendance is already marked for this subject on this date, DO NOT send any notification
      const isAlreadyMarked = records.some(r => r.subjectId === subject.id && r.date === targetDateStr);
      if (isAlreadyMarked) {
        continue;
      }

      const todaySlots = subject.schedule.filter(slot => Number(slot.day) === targetDay);
      const classDurationMinutes = subject.isLab ? 120 : 60; // 2 hrs for lab, 1 hr for theory
      const postClassDelayMinutes = 10; // Prompt sent 10 mins AFTER class end
      
      todaySlots.forEach((slot, index) => {
        const [hours, minutes] = slot.slot.split(':').map(Number);
        const classDate = new Date(targetDate);
        classDate.setHours(hours, minutes, 0, 0);

        // Pre-class reminder
        if (settings.preClassReminder !== false) {
          const triggerDate = new Date(classDate.getTime() - settings.reminderMinutesBefore * 60000);

          if (triggerDate.getTime() > now.getTime()) {
            notifications.push({
              title: 'Upcoming Class',
              body: `${subject.name} starts in ${settings.reminderMinutesBefore} minutes.`,
              id: getReminderId(NOTIF_ID_DAILY_BASE, dayOffset, subject.id, index),
              schedule: { at: triggerDate },
              extra: { subjectId: subject.id, type: 'pre_class' },
              smallIcon: 'ic_launcher',
              iconColor: '#3B82F6',
            });
          }
        }

        // Post-class marking reminder: Sent 10 minutes AFTER class ENDS with 1-tap action buttons
        if (settings.postClassReminder !== false) {
          const postClassDate = new Date(classDate.getTime() + (classDurationMinutes + postClassDelayMinutes) * 60000);
          if (postClassDate.getTime() > now.getTime()) {
            notifications.push({
              title: 'Mark Attendance',
              body: `Did you attend ${subject.name} today? Mark your attendance now!`,
              id: getReminderId(NOTIF_ID_POST_CLASS_BASE, dayOffset, subject.id, index),
              schedule: { at: postClassDate },
              extra: { subjectId: subject.id, type: 'post_class' },
              actionTypeId: 'ATTENDANCE_PROMPT',
              smallIcon: 'ic_launcher',
              iconColor: '#3B82F6',
            });
          }
        }
      });
    }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
};

/**
 * Cancel any pending pre-class and post-class notification for a subject today once attendance is marked
 */
export const cancelTodayClassReminders = async (subjectId: string) => {
  try {
    const pending = await LocalNotifications.getPending();
    const subHash = getSubjectHash(subjectId);
    const toCancel = pending.notifications
      .filter(n => {
        const isClassReminder = n.id >= NOTIF_ID_DAILY_BASE && n.id < NOTIF_ID_THRESHOLD_BASE;
        const matchesSubject = n.extra?.subjectId === subjectId;
        const isTodayReminder = (n.id >= NOTIF_ID_DAILY_BASE && n.id < NOTIF_ID_DAILY_BASE + 10000) ||
                                (n.id >= NOTIF_ID_POST_CLASS_BASE && n.id < NOTIF_ID_POST_CLASS_BASE + 10000);
        return isClassReminder && (matchesSubject || (isTodayReminder && (n.id % 10000 >= subHash * 10 && n.id % 10000 < (subHash + 1) * 10)));
      })
      .map(n => ({ id: n.id }));

    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }
  } catch (err) {
    console.log('Failed to cancel today class reminders', err);
  }
};

export const cancelPostClassReminder = cancelTodayClassReminders;

/**
 * 2 & 3. Threshold and Bunk Budget Warning Alerts
 * Called whenever attendance is marked.
 */
export const handleAttendanceAlerts = async (
  subject: Subject,
  oldRecords: AttendanceRecord[],
  newRecords: AttendanceRecord[],
  settings: AppSettings
) => {
  // If user just marked attendance for today, cancel any pending post-class marking prompt for this subject
  await cancelPostClassReminder(subject.id);

  if (!settings.notificationsEnabled) return;

  const oldStats = calculateSubjectStats(subject, oldRecords, settings.semesterEndDate, settings.holidays);
  const newStats = calculateSubjectStats(subject, newRecords, settings.semesterEndDate, settings.holidays);
  
  const threshold = (subject.threshold || settings.globalThreshold) * 100;
  const subjectHash = getSubjectHash(subject.id);

  // Threshold Alert: Just fell below threshold
  if (oldStats.attendancePct >= threshold && newStats.attendancePct < threshold) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Attendance Shortage!',
          body: `Warning: Your attendance in ${subject.name} has fallen below ${Math.round(threshold)}%.`,
          id: NOTIF_ID_THRESHOLD_BASE + subjectHash,
          schedule: { at: new Date(Date.now() + 1000) }, // Immediate
          smallIcon: 'ic_launcher',
          iconColor: '#3B82F6',
        }
      ]
    });
  }

  // Bunk Budget Alert: Bunk budget dropped to 3 or fewer (or negative)
  if (oldStats.bunkBudget > 3 && newStats.bunkBudget <= 3) {
    // Schedule for next morning 8AM per TRD §5
    const tomorrow8AM = new Date();
    tomorrow8AM.setDate(tomorrow8AM.getDate() + 1);
    tomorrow8AM.setHours(8, 0, 0, 0);

    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID_STATUS_BASE + subjectHash }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Low Bunk Budget Warning',
          body: `${subject.name}: Only ${Math.max(0, newStats.bunkBudget)} bunks left before falling below threshold!`,
          id: NOTIF_ID_STATUS_BASE + subjectHash,
          schedule: { at: tomorrow8AM },
          smallIcon: 'ic_launcher',
          iconColor: '#3B82F6',
        }
      ]
    });
  }
};

/**
 * Sunday 8PM Summary Notification for subjects at risk
 */
export const scheduleSundaySummary = async (
  subjects: Subject[],
  records: AttendanceRecord[],
  settings: AppSettings
) => {
  if (!settings.notificationsEnabled || settings.sundaySummaryNotification === false) return;

  const atRiskSubjects = subjects.filter(s => {
    const stats = calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays);
    return stats.bunkBudget <= 5;
  });

  if (atRiskSubjects.length === 0) return;

  const nextSunday = new Date();
  const day = nextSunday.getDay();
  const daysUntilSunday = (7 - day) % 7 || 7;
  nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
  nextSunday.setHours(20, 0, 0, 0);

  await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID_SUNDAY_SUMMARY }] });

  await LocalNotifications.schedule({
    notifications: [
      {
        title: 'Weekly Bunk Summary',
        body: `${atRiskSubjects.length} subject(s) are low on bunk budget. Plan next week carefully!`,
        id: NOTIF_ID_SUNDAY_SUMMARY,
        schedule: { at: nextSunday },
        smallIcon: 'ic_launcher',
        iconColor: '#3B82F6',
      }
    ]
  });
};

// Cancel all notifications for a specific subject
export const cancelSubjectNotifications = async (subjectId: string) => {
  const hash = getSubjectHash(subjectId);
  await LocalNotifications.cancel({ 
    notifications: [
      { id: NOTIF_ID_THRESHOLD_BASE + hash },
      { id: NOTIF_ID_STATUS_BASE + hash }
    ] 
  });
  await cancelPostClassReminder(subjectId);
};

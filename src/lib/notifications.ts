import { LocalNotifications } from '@capacitor/local-notifications';
import type { Subject, AttendanceRecord, AppSettings } from './types';
import { calculateSubjectStats } from './calculations';
import { ensureNotificationPermission } from './permissions';

// Unique IDs for different notification types
const NOTIF_ID_DAILY_BASE = 1000;
const NOTIF_ID_POST_CLASS_BASE = 1500; // New base for post-class reminders
const NOTIF_ID_THRESHOLD_BASE = 2000; // + subject index/hash
const NOTIF_ID_STATUS_BASE = 3000; // + subject index/hash

const getSubjectHash = (id: string) => {
  return Math.abs(id.split('').reduce((a, b) => { 
    a = ((a << 5) - a) + b.charCodeAt(0); 
    return a & a; 
  }, 0)) % 1000;
};

/**
 * 1. Upcoming Classes Reminders & Post-Class Marking Reminders
 * Schedules individual notifications for each class today.
 */
/**
 * 1. Upcoming Classes Reminders & Post-Class Marking Reminders
 * Schedules individual notifications for each class today.
 */
export const scheduleDailyClassReminders = async (
  subjects: Subject[],
  settings: AppSettings,
  records: AttendanceRecord[] = []
) => {
  await ensureNotificationPermission();

  // Always clear previous pending daily and post-class reminders to prevent duplication
  const pending = await LocalNotifications.getPending();
  const dailyIds = pending.notifications
    .filter(n => n.id >= NOTIF_ID_DAILY_BASE && n.id < NOTIF_ID_THRESHOLD_BASE)
    .map(n => ({ id: n.id }));
  
  if (dailyIds.length > 0) {
    await LocalNotifications.cancel({ notifications: dailyIds });
  }

  if (!settings.notificationsEnabled || settings.holidayMode) {
    return;
  }

  const notifications = [];
  const now = new Date();

  // Schedule reminders for the next 7 days (including today and the next 6 days)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const targetDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const targetDay = targetDate.getDay(); // 0-6 (0 is Sunday)
    const targetDateStr = targetDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format

    for (const subject of subjects) {
      const todaySlots = subject.schedule.filter(slot => Number(slot.day) === targetDay);
      const isAlreadyMarked = records.some(r => r.subjectId === subject.id && r.date === targetDateStr);
      
      for (const slot of todaySlots) {
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
              id: NOTIF_ID_DAILY_BASE + (dayOffset * 70) + (getSubjectHash(subject.id) % 35) + (hours % 24),
              schedule: { at: triggerDate },
              extra: { subjectId: subject.id },
              smallIcon: 'ic_launcher',
              iconColor: '#3B82F6',
            });
          }
        }

        // Post-class marking reminder: ONLY schedule if user has NOT already marked attendance for this class today!
        if (settings.postClassReminder !== false && !isAlreadyMarked) {
          const postClassDate = new Date(classDate.getTime() + 60 * 60000);
          if (postClassDate.getTime() > now.getTime()) {
            notifications.push({
              title: 'Mark Attendance',
              body: `Did you attend today's ${subject.name} class? Mark your attendance now!`,
              id: NOTIF_ID_POST_CLASS_BASE + (dayOffset * 70) + (getSubjectHash(subject.id) % 35) + (hours % 24),
              schedule: { at: postClassDate },
              extra: { subjectId: subject.id },
              smallIcon: 'ic_launcher',
              iconColor: '#3B82F6',
            });
          }
        }
      }
    }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
};

/**
 * Cancel any pending post-class marking notification for a subject if attendance was just marked
 */
export const cancelPostClassReminder = async (subjectId: string) => {
  try {
    const pending = await LocalNotifications.getPending();
    const toCancel = pending.notifications
      .filter(n => n.id >= NOTIF_ID_POST_CLASS_BASE && n.id < NOTIF_ID_THRESHOLD_BASE && (n.extra?.subjectId === subjectId || n.id === NOTIF_ID_POST_CLASS_BASE + getSubjectHash(subjectId)))
      .map(n => ({ id: n.id }));
    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel });
    }
  } catch (err) {
    console.log('Failed to cancel post class reminder', err);
  }
};

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

  const oldStats = calculateSubjectStats(subject, oldRecords, settings.semesterEndDate);
  const newStats = calculateSubjectStats(subject, newRecords, settings.semesterEndDate);
  
  const threshold = settings.globalThreshold * 100;
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
    const stats = calculateSubjectStats(s, records, settings.semesterEndDate);
    return stats.bunkBudget <= 5;
  });

  if (atRiskSubjects.length === 0) return;

  const nextSunday = new Date();
  const day = nextSunday.getDay();
  const daysUntilSunday = (7 - day) % 7 || 7;
  nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
  nextSunday.setHours(20, 0, 0, 0);

  const NOTIF_ID_SUNDAY_SUMMARY = 4000;
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

// Legacy support or specific cleaning
export const cancelSubjectNotifications = async (subjectId: string) => {
  const hash = getSubjectHash(subjectId);
  await LocalNotifications.cancel({ 
    notifications: [
      { id: NOTIF_ID_THRESHOLD_BASE + hash },
      { id: NOTIF_ID_STATUS_BASE + hash }
    ] 
  });
};

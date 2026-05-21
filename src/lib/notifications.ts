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
export const scheduleDailyClassReminders = async (
  subjects: Subject[],
  settings: AppSettings
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

    for (const subject of subjects) {
      const todaySlots = subject.schedule.filter(slot => Number(slot.day) === targetDay);
      
      for (const slot of todaySlots) {
        const [hours, minutes] = slot.slot.split(':').map(Number);
        const classDate = new Date(targetDate);
        classDate.setHours(hours, minutes, 0, 0);

        // Pre-class reminder
        const triggerDate = new Date(classDate.getTime() - settings.reminderMinutesBefore * 60000);

        if (triggerDate.getTime() > now.getTime()) {
          notifications.push({
            title: 'Upcoming Class',
            body: `${subject.name} starts in ${settings.reminderMinutesBefore} minutes.`,
            // Deterministic collision-free ID within [1000, 1500)
            id: NOTIF_ID_DAILY_BASE + (dayOffset * 70) + (getSubjectHash(subject.id) % 35) + (hours % 24),
            schedule: { at: triggerDate },
            extra: { subjectId: subject.id }
          });
        }

        // Post-class marking reminder (60 minutes after start)
        const postClassDate = new Date(classDate.getTime() + 60 * 60000);
        if (postClassDate.getTime() > now.getTime()) {
          notifications.push({
            title: 'Mark Attendance',
            body: `Did you attend today's ${subject.name} class? Mark your attendance now!`,
            // Deterministic collision-free ID within [1500, 2000)
            id: NOTIF_ID_POST_CLASS_BASE + (dayOffset * 70) + (getSubjectHash(subject.id) % 35) + (hours % 24),
            schedule: { at: postClassDate },
            extra: { subjectId: subject.id }
          });
        }
      }
    }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
};

/**
 * 2 & 3. Threshold and Status Change Alerts
 * Called whenever attendance is marked.
 */
export const handleAttendanceAlerts = async (
  subject: Subject,
  oldRecords: AttendanceRecord[],
  newRecords: AttendanceRecord[],
  settings: AppSettings
) => {
  if (!settings.notificationsEnabled) return;

  const oldStats = calculateSubjectStats(subject, oldRecords);
  const newStats = calculateSubjectStats(subject, newRecords);
  
  const threshold = settings.globalThreshold * 100;
  const warningZone = (settings.globalThreshold + settings.warningBuffer) * 100;
  const subjectHash = getSubjectHash(subject.id);

  // 2. Threshold Alert: Just fell below threshold
  if (oldStats.attendancePct >= threshold && newStats.attendancePct < threshold) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Attendance Shortage!',
          body: `Warning: Your attendance in ${subject.name} has fallen below ${threshold}%.`,
          id: NOTIF_ID_THRESHOLD_BASE + subjectHash,
          schedule: { at: new Date(Date.now() + 1000) }, // Immediate
        }
      ]
    });
  }

  // 3. Status Change: Moving from SAFE to AT RISK
  // Safe is > warningZone. At Risk is <= warningZone.
  if (oldStats.attendancePct > warningZone && newStats.attendancePct <= warningZone) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Entering Danger Zone',
          body: `${subject.name} is now AT RISK. You should attend your next few classes.`,
          id: NOTIF_ID_STATUS_BASE + subjectHash,
          schedule: { at: new Date(Date.now() + 2000) }, // Slight delay so not combined with threshold alert
        }
      ]
    });
  }
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

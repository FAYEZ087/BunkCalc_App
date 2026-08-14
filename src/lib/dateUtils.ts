import type { ScheduleSlot, AttendanceRecord, Holiday } from './types';

/**
 * Count remaining class sessions from today (or tomorrow if today is marked) to semesterEndDate,
 * automatically excluding dates that fall within specified college holidays/exams.
 */
export const countRemainingSessions = (
  schedule: ScheduleSlot[],
  semesterEndDate: string,
  records: AttendanceRecord[] = [],
  subjectId?: string,
  holidays: Holiday[] = []
): number => {
  if (!semesterEndDate || !schedule || schedule.length === 0) return 0;

  const parseEndDate = (dateStr: string): Date => {
    let cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanStr.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
    }
    const d = new Date(dateStr);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const endDate = parseEndDate(semesterEndDate);
  
  const now = new Date();
  let current = new Date(now);
  current.setHours(0, 0, 0, 0);

  // If today's attendance for this subject has already been marked, skip today's slot in remaining count
  if (subjectId) {
    const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD local format
    const isTodayMarked = records.some(
      (r) => r.subjectId === subjectId && r.date === todayStr
    );
    if (isTodayMarked) {
      current.setDate(current.getDate() + 1);
    }
  }

  let sessionCount = 0;
  while (current <= endDate) {
    const currentStr = current.toLocaleDateString('en-CA');
    
    // Check if current date is inside any configured college holiday / exam range
    const isHoliday = holidays.some((h) => currentStr >= h.startDate && currentStr <= h.endDate);
    
    if (!isHoliday) {
      const day = current.getDay();
      const classesOnDay = schedule.filter(s => Number(s.day) === day).length;
      sessionCount += classesOnDay;
    }
    
    current.setDate(current.getDate() + 1);
  }

  return sessionCount;
};

/**
 * Count cancelled records for a subject.
 */
export const countCancelledSessions = (
  records: AttendanceRecord[],
  subjectId: string
): number => {
  const cancelledCount = records.filter(
    (r) => r.subjectId === subjectId && r.status === 'cancelled'
  ).length;
  return cancelledCount;
};

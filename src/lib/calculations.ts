import type { AttendanceRecord, Subject } from './types';

export const calculateSubjectStats = (
  subject: Subject,
  records: AttendanceRecord[]
) => {
  const subjectRecords = records.filter((r) => r.subjectId === subject.id);
  
  const attendedCount = subjectRecords.filter((r) => r.status === 'present').length * subject.labMultiplier;
  const absentCount = subjectRecords.filter((r) => r.status === 'absent').length * subject.labMultiplier;
  
  const totalClasses = attendedCount + absentCount;
  const attendancePct = totalClasses === 0 ? 100 : (attendedCount / totalClasses) * 100;
  
  // current safeBunks
  const safeBunks = Math.floor((attendedCount / subject.threshold) - totalClasses);

  // How many more to attend to reach threshold?
  let classesToReachThreshold = 0;
  if (attendancePct < subject.threshold * 100) {
    // attended + X / total + X = threshold
    // X = (threshold * total - attended) / (1 - threshold)
    classesToReachThreshold = Math.ceil((subject.threshold * totalClasses - attendedCount) / (1 - subject.threshold));
  }

  return {
    attendedCount,
    absentCount,
    totalClasses,
    attendancePct,
    safeBunks: Math.max(0, safeBunks),
    classesToReachThreshold: Math.max(0, classesToReachThreshold),
  };
};

export const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const calculateProjections = (
  subject: Subject,
  records: AttendanceRecord[],
  semesterEndDate: string
) => {
  const stats = calculateSubjectStats(subject, records);
  const endDate = new Date(semesterEndDate);
  const now = new Date();
  
  // Calculate remaining classes
  let remainingClasses = 0;
  let current = new Date(now);
  current.setHours(0, 0, 0, 0);

  // If today's attendance for this subject has already been marked, skip today's slot in remaining count
  const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD local format
  const isTodayMarked = records.some(
    (r) => r.subjectId === subject.id && r.date === todayStr
  );
  if (isTodayMarked) {
    current.setDate(current.getDate() + 1);
  }

  while (current <= endDate) {
    const day = current.getDay();
    const classesToday = subject.schedule.filter(s => Number(s.day) === day).length;
    remainingClasses += classesToday;
    current.setDate(current.getDate() + 1);
  }

  const potentialTotal = stats.totalClasses + (remainingClasses * subject.labMultiplier);
  const maxAttended = stats.attendedCount + (remainingClasses * subject.labMultiplier);
  const maxPossiblePct = potentialTotal === 0 ? 100 : (maxAttended / potentialTotal) * 100;

  return {
    ...stats,
    remainingClasses,
    maxPossiblePct,
    potentialTotal,
    maxAttended,
  };
};

export const getStatusColor = (percentage: number) => {
  if (percentage >= 85) return 'text-green-500';
  if (percentage >= 75) return 'text-amber-500';
  return 'text-red-500';
};

export const getStatusBgColor = (percentage: number) => {
  if (percentage >= 85) return 'bg-green-500';
  if (percentage >= 75) return 'bg-amber-500';
  return 'bg-red-500';
};

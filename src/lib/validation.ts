export function sanitizeName(name: string): string {
  if (typeof name !== 'string') return '';
  let sanitized = name.trim();
  
  // Strip script tags first
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Strip HTML tags entirely to prevent any HTML injection
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Strip control characters (C0 and C1 control codes) and non-printable characters
  // C0 control characters: \x00-\x1F, \x7F
  // C1 control characters: \x80-\x9F
  // Unicode format characters like zero-width spaces, RTL/LTR overrides, etc.
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF\u202E\u202F]/g, '');

  // Collapse inner multiple spaces/whitespace to one space
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

export function validateSubjectName(name: string, existingNames: string[]): { valid: boolean; error?: string } {
  const sanitized = sanitizeName(name);
  if (!sanitized) {
    return { valid: false, error: 'Subject name cannot be empty.' };
  }
  if (sanitized.length > 40) {
    return { valid: false, error: 'Subject name cannot exceed 40 characters.' };
  }
  const lowerSanitized = sanitized.toLowerCase();
  const isDuplicate = existingNames.some(existing => sanitizeName(existing).toLowerCase() === lowerSanitized);
  if (isDuplicate) {
    return { valid: false, error: 'A subject with this name already exists.' };
  }
  return { valid: true };
}

export function validateArchiveName(name: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeName(name);
  if (!sanitized) {
    return { valid: false, error: 'Archive name cannot be empty.' };
  }
  if (sanitized.length > 50) {
    return { valid: false, error: 'Archive name cannot exceed 50 characters.' };
  }
  return { valid: true };
}

function hasPrototypePollution(obj: any): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (hasPrototypePollution(item)) {
        return true;
      }
    }
  } else {
    const keys = Object.keys(obj);
    for (const key of keys) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return true;
      }
      if (hasPrototypePollution(obj[key])) {
        return true;
      }
    }
  }
  return false;
}

function isString(val: any): val is string {
  return typeof val === 'string';
}

function isNumber(val: any): val is number {
  return typeof val === 'number' && !isNaN(val);
}

function isBoolean(val: any): val is boolean {
  return typeof val === 'boolean';
}

const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/; // HH:MM
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

function validateScheduleSlot(slot: any): boolean {
  if (!slot || typeof slot !== 'object') return false;
  if (!isNumber(slot.day) || slot.day < 0 || slot.day > 6) return false;
  if (!isString(slot.slot) || !TIME_REGEX.test(slot.slot)) return false;
  return true;
}

function validateSubject(sub: any): { valid: boolean; data?: any } {
  if (!sub || typeof sub !== 'object') return { valid: false };
  if (!isString(sub.id) || !sub.id.trim()) return { valid: false };
  if (!isString(sub.name)) return { valid: false };
  
  const sanitizedName = sanitizeName(sub.name);
  if (!sanitizedName || sanitizedName.length > 40) return { valid: false };
  
  if (!isNumber(sub.credits) || sub.credits < 1 || sub.credits > 5) return { valid: false };
  if (!isNumber(sub.threshold) || sub.threshold < 0 || sub.threshold > 1) return { valid: false };
  
  if (!Array.isArray(sub.schedule)) return { valid: false };
  for (const slot of sub.schedule) {
    if (!validateScheduleSlot(slot)) return { valid: false };
  }
  
  if (sub.labMultiplier !== 1 && sub.labMultiplier !== 2) return { valid: false };
  
  return {
    valid: true,
    data: {
      id: sub.id.trim(),
      name: sanitizedName,
      credits: sub.credits,
      threshold: sub.threshold,
      schedule: sub.schedule.map((s: any) => ({ day: s.day, slot: s.slot })),
      labMultiplier: sub.labMultiplier
    }
  };
}

function validateAttendanceRecord(rec: any): { valid: boolean; data?: any } {
  if (!rec || typeof rec !== 'object') return { valid: false };
  if (!isString(rec.id) || !rec.id.trim()) return { valid: false };
  if (!isString(rec.subjectId) || !rec.subjectId.trim()) return { valid: false };
  if (!isString(rec.date) || !DATE_REGEX.test(rec.date)) return { valid: false };
  if (rec.status !== 'present' && rec.status !== 'absent' && rec.status !== 'cancelled') return { valid: false };
  
  return {
    valid: true,
    data: {
      id: rec.id.trim(),
      subjectId: rec.subjectId.trim(),
      date: rec.date,
      status: rec.status
    }
  };
}

function validateSettings(set: any): { valid: boolean; data?: any } {
  if (!set || typeof set !== 'object') return { valid: false };
  if (!isNumber(set.globalThreshold) || set.globalThreshold < 0 || set.globalThreshold > 1) return { valid: false };
  if (!isNumber(set.warningBuffer) || set.warningBuffer < 0 || set.warningBuffer > 1) return { valid: false };
  if (!isBoolean(set.notificationsEnabled)) return { valid: false };
  
  const validReminderMinutes = [5, 10, 15, 30];
  if (!validReminderMinutes.includes(set.reminderMinutesBefore)) return { valid: false };
  
  if (!isBoolean(set.holidayMode)) return { valid: false };
  if (!isBoolean(set.hapticsEnabled)) return { valid: false };
  
  if (set.theme !== 'light' && set.theme !== 'dark' && set.theme !== 'system') return { valid: false };
  
  const result: any = {
    globalThreshold: set.globalThreshold,
    warningBuffer: set.warningBuffer,
    notificationsEnabled: set.notificationsEnabled,
    reminderMinutesBefore: set.reminderMinutesBefore,
    holidayMode: set.holidayMode,
    hapticsEnabled: set.hapticsEnabled,
    theme: set.theme
  };

  if (set.semesterEndDate !== undefined) {
    if (!isString(set.semesterEndDate)) return { valid: false };
    result.semesterEndDate = set.semesterEndDate;
  }

  return {
    valid: true,
    data: result
  };
}

function validateArchivedSemester(sem: any): { valid: boolean; data?: any } {
  if (!sem || typeof sem !== 'object') return { valid: false };
  if (!isString(sem.id) || !sem.id.trim()) return { valid: false };
  if (!isString(sem.name)) return { valid: false };
  
  const sanitizedName = sanitizeName(sem.name);
  if (!sanitizedName || sanitizedName.length > 50) return { valid: false };
  
  if (!isString(sem.endDate)) return { valid: false };
  if (!isString(sem.archivedAt)) return { valid: false };
  if (!isNumber(sem.overallPct) || sem.overallPct < 0 || sem.overallPct > 100) return { valid: false };
  
  if (!Array.isArray(sem.subjects)) return { valid: false };
  const validatedSubjects: any[] = [];
  for (const sub of sem.subjects) {
    const v = validateSubject(sub);
    if (!v.valid) return { valid: false };
    validatedSubjects.push(v.data);
  }
  
  if (!Array.isArray(sem.records)) return { valid: false };
  const validatedRecords: any[] = [];
  for (const rec of sem.records) {
    const v = validateAttendanceRecord(rec);
    if (!v.valid) return { valid: false };
    validatedRecords.push(v.data);
  }
  
  return {
    valid: true,
    data: {
      id: sem.id.trim(),
      name: sanitizedName,
      endDate: sem.endDate,
      archivedAt: sem.archivedAt,
      overallPct: sem.overallPct,
      subjects: validatedSubjects,
      records: validatedRecords
    }
  };
}

export function validateImportPayload(data: unknown): { valid: boolean; error?: string; data?: any } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Import payload must be a valid JSON object.' };
  }

  if (hasPrototypePollution(data)) {
    return { valid: false, error: 'Prototype pollution detected in import payload.' };
  }

  const payload = data as any;

  // Validate subjects
  if (!payload.subjects || !Array.isArray(payload.subjects)) {
    return { valid: false, error: 'Import data is missing "subjects" array.' };
  }
  if (payload.subjects.length > 100) {
    return { valid: false, error: 'Subjects count exceeds the limit of 100.' };
  }
  const sanitizedSubjects: any[] = [];
  for (let i = 0; i < payload.subjects.length; i++) {
    const v = validateSubject(payload.subjects[i]);
    if (!v.valid) {
      return { valid: false, error: `Invalid subject schema at index ${i}.` };
    }
    sanitizedSubjects.push(v.data);
  }

  // Validate attendance
  if (!payload.attendance || !Array.isArray(payload.attendance)) {
    return { valid: false, error: 'Import data is missing "attendance" array.' };
  }
  if (payload.attendance.length > 50000) {
    return { valid: false, error: 'Attendance records count exceeds the limit of 50,000.' };
  }
  const sanitizedAttendance: any[] = [];
  for (let i = 0; i < payload.attendance.length; i++) {
    const v = validateAttendanceRecord(payload.attendance[i]);
    if (!v.valid) {
      return { valid: false, error: `Invalid attendance record schema at index ${i}.` };
    }
    sanitizedAttendance.push(v.data);
  }

  // Validate settings (optional)
  let sanitizedSettings: any = undefined;
  if (payload.settings !== undefined) {
    const v = validateSettings(payload.settings);
    if (!v.valid) {
      return { valid: false, error: 'Invalid settings schema.' };
    }
    sanitizedSettings = v.data;
  }

  // Validate archived_semesters (optional)
  let sanitizedArchived: any[] = [];
  if (payload.archived_semesters !== undefined) {
    if (!Array.isArray(payload.archived_semesters)) {
      return { valid: false, error: '"archived_semesters" must be an array.' };
    }
    if (payload.archived_semesters.length > 50) {
      return { valid: false, error: 'Archived semesters count exceeds the limit of 50.' };
    }
    for (let i = 0; i < payload.archived_semesters.length; i++) {
      const v = validateArchivedSemester(payload.archived_semesters[i]);
      if (!v.valid) {
        return { valid: false, error: `Invalid archived semester schema at index ${i}.` };
      }
      sanitizedArchived.push(v.data);
    }
  }

  const result: any = {
    subjects: sanitizedSubjects,
    attendance: sanitizedAttendance,
  };
  if (sanitizedSettings !== undefined) {
    result.settings = sanitizedSettings;
  }
  if (payload.archived_semesters !== undefined) {
    result.archived_semesters = sanitizedArchived;
  }

  return {
    valid: true,
    data: result
  };
}

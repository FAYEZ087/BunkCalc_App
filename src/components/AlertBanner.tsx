import React, { useMemo } from 'react';
import type { Subject } from '../lib/types';
import { useAttendance } from '../store/useAttendance';
import { useSettings } from '../store/useSettings';
import { calculateSubjectStats } from '../lib/calculations';

const AlertBanner: React.FC<{ subjects: Subject[] }> = ({ subjects }) => {
  const { records } = useAttendance();
  const { settings } = useSettings();

  const atRiskSubjects = useMemo(() => subjects.filter((s) => {
    const stats = calculateSubjectStats(s, records, settings.semesterEndDate, settings.holidays);
    return stats.bunkBudget <= 3 || stats.attendancePct < (settings.globalThreshold + settings.warningBuffer) * 100;
  }), [subjects, records, settings.semesterEndDate, settings.holidays, settings.globalThreshold, settings.warningBuffer]);

  if (atRiskSubjects.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6 flex items-center gap-3">
      <div className="bg-red-500 p-2 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <h4 className="text-red-500 font-bold text-sm">Danger Zone</h4>
        <p className="text-red-600/70 dark:text-red-200/70 text-xs">
          {atRiskSubjects.length === 1 
            ? `${atRiskSubjects[0].name} is below safe threshold.` 
            : `${atRiskSubjects.length} subjects are at risk.`}
        </p>
      </div>
    </div>
  );
};

export default AlertBanner;

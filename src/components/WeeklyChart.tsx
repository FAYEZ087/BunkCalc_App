import React, { useEffect, useState, useMemo } from 'react';
import type { AttendanceRecord } from '../lib/types';
import { parseLocalDate } from '../lib/calculations';

interface Props {
  records: AttendanceRecord[];
  threshold: number;
}

const WeeklyChart: React.FC<Props> = ({ records, threshold }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Slight delay to ensure CSS transition triggers after initial render
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const weekData = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;

    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - diffToMonday);
    currentMonday.setHours(0, 0, 0, 0);

    interface WeekData {
      start: Date;
      end: Date;
      label: string;
      present: number;
      absent: number;
    }

    const weeks: WeekData[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(currentMonday.getDate() - (i * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      // Calculate ISO week number for label
      const d = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

      weeks.push({
        start: weekStart,
        end: weekEnd,
        label: `W${weekNo}`,
        present: 0,
        absent: 0
      });
    }

    records.forEach(r => {
      if (r.status === 'cancelled') return;
      const d = parseLocalDate(r.date);
      for (const w of weeks) {
        if (d >= w.start && d <= w.end) {
          if (r.status === 'present') w.present++;
          else if (r.status === 'absent') w.absent++;
          break;
        }
      }
    });

    return weeks.map(w => {
      const total = w.present + w.absent;
      const percentage = total === 0 ? 0 : (w.present / total) * 100;
      return { ...w, total, percentage };
    });
  }, [records]);

  const getBarColor = (percentage: number, total: number) => {
    if (total === 0) return 'bg-slate-200 dark:bg-slate-800';
    if (percentage >= threshold * 100) return 'bg-green-500';
    if (percentage >= (threshold * 100) - 5) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <section className="mb-8">
      <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Weekly Trend</h2>
      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="h-40 flex items-end justify-between gap-2 pt-6 pb-2">
          {weekData.map((week, idx) => {
            const height = week.total === 0 ? 5 : week.percentage; // 5% minimum height for empty
            const showValue = week.total > 0;
            return (
              <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group">
                <div className="w-full flex justify-center relative h-full items-end">
                  {showValue && (
                    <span className="absolute -top-6 text-[10px] font-bold text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {Math.round(week.percentage)}%
                    </span>
                  )}
                  <div
                    className={`w-full max-w-[24px] rounded-t-sm transition-all duration-500 ease-out ${getBarColor(week.percentage, week.total)}`}
                    style={{ height: mounted ? `${height}%` : '0%' }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-2">{week.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WeeklyChart;

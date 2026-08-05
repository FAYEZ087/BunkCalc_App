import React, { useMemo } from 'react';
import { useSubjects } from '../store/useSubjects';
import type { Subject } from '../lib/types';

const BLOCK_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
] as const;

interface DayColumn {
  label: string;
  dayIndex: number;
}

const BASE_DAYS: DayColumn[] = [
  { label: 'Mon', dayIndex: 1 },
  { label: 'Tue', dayIndex: 2 },
  { label: 'Wed', dayIndex: 3 },
  { label: 'Thu', dayIndex: 4 },
  { label: 'Fri', dayIndex: 5 },
  { label: 'Sat', dayIndex: 6 },
];

interface ClassBlock {
  subject: Subject;
  slot: string;
  colorClass: string;
}

const TimetableGrid: React.FC = () => {
  const subjects = useSubjects((s) => s.subjects);
  const today = new Date().getDay();

  // Build a color map keyed by subject index for consistent coloring
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subj, idx) => {
      map.set(subj.id, BLOCK_COLORS[idx % BLOCK_COLORS.length]);
    });
    return map;
  }, [subjects]);

  // Check if any subject has a Sunday class
  const hasSunday = useMemo(
    () => subjects.some((s) => s.schedule.some((sc) => sc.day === 0)),
    [subjects],
  );

  const days = useMemo<DayColumn[]>(() => {
    if (hasSunday) return [{ label: 'Sun', dayIndex: 0 }, ...BASE_DAYS];
    return BASE_DAYS;
  }, [hasSunday]);

  // Group classes by day
  const classesByDay = useMemo(() => {
    const map = new Map<number, ClassBlock[]>();

    days.forEach((d) => map.set(d.dayIndex, []));

    subjects.forEach((subj) => {
      subj.schedule.forEach((sc) => {
        const list = map.get(sc.day);
        if (list) {
          list.push({
            subject: subj,
            slot: sc.slot,
            colorClass: colorMap.get(subj.id) ?? BLOCK_COLORS[0],
          });
        }
      });
    });

    // Sort each day's classes by slot string (natural time order)
    map.forEach((blocks) => {
      blocks.sort((a, b) => a.slot.localeCompare(b.slot));
    });

    return map;
  }, [subjects, days, colorMap]);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <div
        className="overflow-x-auto"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Hide scrollbar for Webkit browsers */}
        <style>{`
          .timetable-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div className="timetable-scroll flex gap-3 min-w-max scroll-smooth overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {days.map((day) => {
            const isToday = day.dayIndex === today;
            const blocks = classesByDay.get(day.dayIndex) ?? [];

            return (
              <div
                key={day.dayIndex}
                className={`flex flex-col min-w-[140px] flex-1 rounded-xl transition-colors duration-200 ${
                  isToday
                    ? 'border-t-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-[0_0_16px_-4px_rgba(59,130,246,0.25)]'
                    : ''
                }`}
              >
                {/* Column header */}
                <div className="sticky top-0 z-10 px-3 pt-3 pb-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      isToday
                        ? 'text-blue-500'
                        : 'text-slate-500'
                    }`}
                  >
                    {day.label}
                  </span>
                  {isToday && (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>

                {/* Class blocks */}
                <div className="px-1.5 pb-2 flex flex-col gap-2">
                  {blocks.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-[10px] text-slate-400 dark:text-slate-600 italic">
                        No classes
                      </span>
                    </div>
                  ) : (
                    blocks.map((block, blockIdx) => (
                      <div
                        key={`${block.subject.id}-${block.slot}-${blockIdx}`}
                        className={`${block.colorClass} rounded-xl p-3 mb-0 min-w-[120px] text-white shadow-md
                          hover:scale-[1.03] hover:shadow-lg transition-all duration-200 cursor-default`}
                      >
                        <p className="font-bold text-xs truncate leading-tight">
                          {block.subject.name}
                        </p>
                        <p className="text-[10px] text-white/70 mt-1 leading-tight">
                          {block.slot}
                        </p>
                        {block.subject.isLab && (
                          <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                            Lab (2 hrs)
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimetableGrid;

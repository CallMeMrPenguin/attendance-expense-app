import React from 'react';
import { Clock } from 'lucide-react';
import { DAYS, getEndTime, formatCleanTimeString, formatVND, Session } from '@/lib/utils';

interface CalendarWeekViewProps {
  sessions: Session[];
  onSessionClick: (id: string) => void;
}

export default function CalendarWeekView({ sessions, onSessionClick }: CalendarWeekViewProps) {
  // Extract and sort all unique start times across the sessions
  const timeSlots = Array.from(
    new Set(sessions.map((s) => formatCleanTimeString(s.time)))
  ).sort();

  if (timeSlots.length === 0) return null;

  return (
    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-250 dark:border-slate-800 shadow-sm min-w-[980px]">
      
      {/* Grid Header */}
      <div className="grid grid-cols-[100px_repeat(7,_minmax(0,_1fr))] bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="py-3 px-2 flex items-center justify-center gap-1 text-xs font-extrabold uppercase text-slate-500 tracking-wider">
          <Clock className="h-3.5 w-3.5" />
          Giờ
        </div>
        {DAYS.map((day, idx) => {
          const isWeekend = idx === 5 || idx === 6;
          return (
            <div
              key={day}
              className={`py-3 text-center text-xs font-extrabold uppercase tracking-wider ${
                isWeekend ? 'text-rose-500 bg-rose-50/20 dark:bg-rose-950/10' : 'text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Grid Rows */}
      <div className="divide-y divide-slate-200 dark:divide-slate-800 bg-slate-100 dark:bg-slate-900">
        {timeSlots.map((slot) => {
          // Find all sessions in this time slot on all days to draw colored stripes
          const slotSessionsAllDays = sessions.filter((s) => formatCleanTimeString(s.time) === slot);
          const uniqueStudents = Array.from(new Set(slotSessionsAllDays.map((s) => s.student_name)));

          return (
            <div
              key={slot}
              className="grid grid-cols-[100px_repeat(7,_minmax(0,_1fr))] bg-white dark:bg-slate-900 min-h-[90px]"
            >
              {/* Hour time slot with colored student indicator stripes */}
              <div className="relative px-3 flex items-center justify-center font-bold text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/30 border-r border-slate-250 dark:border-slate-800 select-none">
                {uniqueStudents.length > 0 && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 flex flex-col overflow-hidden">
                    {uniqueStudents.map((student) => {
                      const color = slotSessionsAllDays.find((s) => s.student_name === student)?.color || '#4f46e5';
                      return (
                        <div
                          key={student}
                          className="flex-grow w-full"
                          style={{ backgroundColor: color }}
                        />
                      );
                    })}
                  </div>
                )}
                <span>{slot}</span>
              </div>

              {/* Day slots cells */}
              {DAYS.map((day) => {
                const slotSessions = sessions.filter(
                  (s) => s.day_of_week === day && formatCleanTimeString(s.time) === slot
                );

                // Group duplicate sessions in the slot (e.g. multiple recurring Mondays) to merge them into 1 card
                const grouped: Record<string, Session[]> = {};
                slotSessions.forEach((s) => {
                  const key = `${s.student_name}|${s.price}|${formatCleanTimeString(s.time)}|${s.duration}`;
                  if (!grouped[key]) {
                    grouped[key] = [];
                  }
                  grouped[key].push(s);
                });

                return (
                  <div
                    key={`${slot}-${day}`}
                    className="p-1.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0 flex flex-col gap-1.5 overflow-y-auto max-h-[120px]"
                  >
                    {Object.values(grouped).map((group) => {
                      const s = group[0];
                      const startTime = formatCleanTimeString(s.time);
                      const endTime = getEndTime(startTime, s.duration);

                      const total = group.length;
                      const completed = group.filter((item) => item.status === 'Đã dạy').length;
                      const cancelled = group.filter((item) => item.status === 'Hủy').length;
                      const pending = total - completed - cancelled;

                      let statusClass = 'bg-white dark:bg-slate-950';
                      if (completed === total) {
                        statusClass = 'bg-slate-50/70 dark:bg-slate-950/30 border-slate-200/50';
                      } else if (cancelled === total) {
                        statusClass = 'opacity-55 select-none bg-slate-50/20';
                      }

                      return (
                        <div
                          key={s.id}
                          onClick={() => onSessionClick(s.id)}
                          className={`flex border border-slate-100 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all active:scale-[0.98] min-h-[58px] ${statusClass}`}
                          style={{ borderLeft: `4px solid ${s.color}` }}
                        >
                          {/* Time Column inside card */}
                          <div
                            className="flex flex-col justify-center items-center px-1.5 py-1 text-[10px] font-extrabold w-[52px] select-none text-center border-r border-slate-100 dark:border-slate-800"
                            style={{ backgroundColor: `${s.color}10`, color: s.color }}
                          >
                            <span className="leading-none">{startTime}</span>
                            <span className="text-[7px] my-0.5 opacity-60">↓</span>
                            <span className="leading-none">{endTime}</span>
                          </div>

                          {/* Info Column */}
                          <div className="flex-grow p-1.5 flex flex-col justify-between overflow-hidden">
                            <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                              {s.student_name}
                            </h4>
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 select-none leading-none">
                              {formatVND(s.price)}
                            </div>

                            {/* Grouped Status Badges */}
                            <div className="flex flex-wrap gap-1 mt-1 select-none">
                              {completed > 0 && (
                                <span className="text-[8px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-250 px-1 py-0.2 rounded dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                                  {completed} Đã dạy
                                </span>
                              )}
                              {pending > 0 && (
                                <span className="text-[8px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.2 rounded dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
                                  {pending} Chưa dạy
                                </span>
                              )}
                              {cancelled > 0 && (
                                <span className="text-[8px] font-extrabold bg-red-50 text-red-700 border border-red-200 px-1 py-0.2 rounded dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30">
                                  {cancelled} Hủy
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

    </div>
  );
}

import React from 'react';
import { DAYS, getEndTime, formatCleanTimeString, formatVND, Session } from '@/lib/utils';

interface CalendarMonthViewProps {
  selectedMonth: string; // "YYYY-MM"
  sessions: Session[];
  onSessionClick: (id: string) => void;
}

export default function CalendarMonthView({
  selectedMonth,
  sessions,
  onSessionClick,
}: CalendarMonthViewProps) {
  const [year, month] = selectedMonth.split('-').map(Number);
  if (!year || !month) return null;

  const firstDay = new Date(year, month - 1, 1);
  const totalDays = new Date(year, month, 0).getDate();
  const firstDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon...
  
  // Calculate offset to start grid on Monday
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;

  const today = new Date();
  const isToday = (dayNum: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() + 1 === month &&
      today.getDate() === dayNum
    );
  };

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    cells.push({
      index: i,
      dayNum,
      inMonth: dayNum > 0 && dayNum <= totalDays,
      isWeekend: i % 7 === 5 || i % 7 === 6, // Sat or Sun
    });
  }

  // Helper to get time in minutes for sorting
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  return (
    <div className="w-full bg-slate-300 dark:bg-slate-800 rounded-2xl smooth-rounded border border-slate-250 dark:border-slate-800 shadow-sm min-w-[980px]">
      
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-950 border-b border-slate-250 dark:border-slate-800">
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

      {/* Grid Cells */}
      <div className="grid grid-cols-7 gap-[1px]">
        {cells.map((cell) => {
          if (!cell.inMonth) {
            // Padding cells (previous/next month placeholder)
            let displayDay = '';
            if (cell.dayNum <= 0) {
              const prevMonthTotalDays = new Date(year, month - 1, 0).getDate();
              displayDay = String(prevMonthTotalDays + cell.dayNum);
            } else {
              displayDay = String(cell.dayNum - totalDays);
            }

            return (
              <div
                key={`pad-${cell.index}`}
                className="bg-slate-100/60 dark:bg-slate-900/40 min-h-[140px] p-2 text-slate-400 dark:text-slate-600 opacity-60 flex flex-col"
              >
                <span className="text-xs font-bold font-sans self-start select-none">
                  {displayDay}
                </span>
              </div>
            );
          }

          // Active Month day cell
          const dayNum = cell.dayNum;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          
          // Filter sessions on this date and sort chronologically
          const daySessions = sessions
            .filter((s) => s.date === dateStr)
            .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

          const cellIsToday = isToday(dayNum);

          return (
            <div
              key={`day-${dayNum}`}
              className={`bg-white dark:bg-slate-900 min-h-[140px] p-2 transition-all flex flex-col gap-1.5 ${
                cellIsToday 
                  ? 'ring-2 ring-indigo-500 z-10 dark:bg-indigo-950/10' 
                  : cell.isWeekend 
                    ? 'bg-slate-50/30 dark:bg-slate-950/20' 
                    : 'hover:bg-slate-50/40 dark:hover:bg-slate-850/20'
              }`}
            >
              {/* Day Number */}
              <div className="flex justify-between items-center shrink-0">
                <span
                  className={`text-xs font-bold font-sans rounded-full flex items-center justify-center h-5 w-5 ${
                    cellIsToday
                      ? 'bg-indigo-600 text-white font-extrabold shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {dayNum}
                </span>
              </div>

              {/* Day Session Cards */}
              <div className="flex-grow flex flex-col gap-1 overflow-y-auto max-h-[120px] custom-scrollbar">
                {daySessions.map((s) => {
                  const startTime = formatCleanTimeString(s.time);
                  const endTime = getEndTime(startTime, s.duration);
                  
                  let badgeBg = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
                  let badgeText = 'Chưa dạy';
                  let isCompleted = false;
                  let isCancelled = false;

                  if (s.status === 'Đã dạy') {
                    badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
                    badgeText = 'Đã dạy';
                    isCompleted = true;
                  } else if (s.status === 'Hủy') {
                    badgeBg = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30';
                    badgeText = 'Đã hủy';
                    isCancelled = true;
                  }

                  return (
                    <div
                      key={s.id}
                      onClick={() => onSessionClick(s.id)}
                      className={`flex bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all active:scale-[0.98] min-h-[58px] ${
                        isCompleted ? 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200/50' : ''
                      } ${isCancelled ? 'opacity-50 select-none' : ''}`}
                      style={{ borderLeft: `4px solid ${s.color}` }}
                    >
                      {/* Left Time Bar */}
                      <div
                        className="flex flex-col justify-center items-center px-1.5 py-1 text-[10px] font-extrabold w-[52px] select-none text-center border-r border-slate-100 dark:border-slate-800"
                        style={{ backgroundColor: `${s.color}10`, color: s.color }}
                      >
                        <span className="leading-none">{startTime}</span>
                        <span className="text-[7px] my-0.5 opacity-60">↓</span>
                        <span className="leading-none">{endTime}</span>
                      </div>

                      {/* Right Details */}
                      <div className="flex-grow p-1.5 flex flex-col justify-between overflow-hidden">
                        <h4 className={`text-[11px] font-bold truncate leading-tight ${
                          isCancelled ? 'line-through text-slate-400 dark:text-slate-600' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {s.student_name}
                        </h4>
                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 select-none leading-none">
                          {formatVND(s.price)}
                        </div>
                        <span className={`text-[8px] font-extrabold border uppercase px-1.5 py-0.5 mt-1 rounded w-fit select-none leading-none ${badgeBg}`}>
                          {badgeText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

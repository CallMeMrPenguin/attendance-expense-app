import React from 'react';
import { DAYS, getEndTime, formatCleanTimeString, formatVND, Session } from '@/lib/utils';

interface CalendarMonthViewProps {
  selectedMonth: string; // "YYYY-MM"
  sessions: Session[];
  onSessionClick: (id: string) => void;
}

// Design helper to generate single-color (violet) shades based on time and status
export function getPremiumVioletStyle(timeStr: string, status: string) {
  if (status === 'Hủy') {
    return {
      bg: 'rgba(123, 97, 255, 0.02)',
      border: 'rgba(123, 97, 255, 0.1)',
      innerBorder: 'rgba(123, 97, 255, 0.05)',
      color: 'rgba(123, 97, 255, 0.3)',
      titleColor: 'rgba(123, 97, 255, 0.4)',
      priceColor: 'rgba(123, 97, 255, 0.3)',
      shadow: 'none'
    };
  }

  if (status === 'Đã dạy') {
    return {
      // Muted Purple
      bg: 'rgba(123, 97, 255, 0.05)',
      border: 'rgba(123, 97, 255, 0.25)',
      innerBorder: 'rgba(123, 97, 255, 0.12)',
      color: 'rgba(123, 97, 255, 0.6)',
      titleColor: 'rgba(123, 97, 255, 0.7)',
      priceColor: 'rgba(123, 97, 255, 0.6)',
      shadow: '0 2px 10px rgba(123, 97, 255, 0.02)'
    };
  }

  // Parse time of session
  let hour = 8;
  const match = timeStr.match(/^(\d+)/);
  if (match) {
    hour = parseInt(match[1]);
  }

  if (hour < 12) {
    // Morning - Light Purple
    return {
      bg: 'rgba(123, 97, 255, 0.06)',
      border: 'rgba(123, 97, 255, 0.45)',
      innerBorder: 'rgba(123, 97, 255, 0.25)',
      color: '#7b61ff',
      titleColor: 'var(--text-main)',
      priceColor: '#7b61ff',
      shadow: '0 4px 16px rgba(123, 97, 255, 0.04)'
    };
  } else if (hour < 18) {
    // Afternoon - Medium Purple
    return {
      bg: 'rgba(123, 97, 255, 0.12)',
      border: 'rgba(123, 97, 255, 0.65)',
      innerBorder: 'rgba(123, 97, 255, 0.35)',
      color: '#7b61ff',
      titleColor: 'var(--text-main)',
      priceColor: '#7b61ff',
      shadow: '0 6px 20px rgba(123, 97, 255, 0.06)'
    };
  } else {
    // Evening - Deep Purple
    return {
      bg: 'rgba(123, 97, 255, 0.18)',
      border: 'rgba(123, 97, 255, 0.85)',
      innerBorder: 'rgba(123, 97, 255, 0.45)',
      color: '#7b61ff',
      titleColor: 'var(--text-main)',
      priceColor: '#7b61ff',
      shadow: '0 8px 24px rgba(123, 97, 255, 0.08)'
    };
  }
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

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  return (
    <div className="w-full bg-slate-200/40 dark:bg-white/5 rounded-3xl smooth-rounded border border-slate-200/50 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.03)] min-w-[980px]">
      
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-200/40 dark:border-white/5 select-none">
        {DAYS.map((day, idx) => {
          const isWeekend = idx === 5 || idx === 6;
          return (
            <div
              key={day}
              className={`py-3.5 text-center text-[11px] font-extrabold uppercase tracking-widest ${
                isWeekend ? 'text-rose-500/80 bg-rose-500/2' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-[1px] bg-slate-200/40 dark:bg-white/5">
        {cells.map((cell) => {
          if (!cell.inMonth) {
            return (
              <div 
                key={`empty-${cell.index}`} 
                className="bg-slate-50/20 dark:bg-slate-950/10 min-h-[140px]" 
              />
            );
          }

          const dayNum = cell.dayNum;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          
          const daySessions = sessions
            .filter((s) => s.date === dateStr)
            .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

          const cellIsToday = isToday(dayNum);

          return (
            <div
              key={`day-${dayNum}`}
              className={`bg-white dark:bg-[#11131a]/80 min-h-[145px] p-3 transition-all flex flex-col gap-2 relative ${
                cellIsToday 
                  ? 'ring-1 ring-indigo-500/40 z-10 bg-indigo-500/2 dark:bg-indigo-950/5' 
                  : cell.isWeekend 
                    ? 'bg-slate-50/20 dark:bg-[#11131a]/30' 
                    : 'hover:bg-slate-50/30 dark:hover:bg-[#171a22]/30'
              }`}
            >
              {/* Day Number */}
              <div className="flex justify-between items-center shrink-0 select-none">
                <span
                  className={`text-[12px] font-extrabold font-sans rounded-full flex items-center justify-center h-5.5 w-5.5 ${
                    cellIsToday
                      ? 'bg-[#7b61ff] text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {dayNum}
                </span>
              </div>

              {/* Day Session Cards */}
              <div className="flex-grow flex flex-col gap-2 overflow-y-auto max-h-[120px] custom-scrollbar pr-0.5">
                {daySessions.map((s) => {
                  const startTime = formatCleanTimeString(s.time);
                  const endTime = getEndTime(startTime, s.duration);
                  const vStyle = getPremiumVioletStyle(s.time, s.status);

                  return (
                    <div
                      key={s.id}
                      onClick={() => onSessionClick(s.id)}
                      className="flex rounded-xl cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all active:scale-[0.98] min-h-[58px] border event-float"
                      style={{
                        backgroundColor: vStyle.bg,
                        borderColor: vStyle.border,
                        boxShadow: vStyle.shadow
                      }}
                    >
                      {/* Left Time Bar */}
                      <div
                        className="flex flex-col justify-center items-center px-1.5 py-1 text-[9px] font-extrabold w-[48px] select-none text-center border-r"
                        style={{ 
                          borderColor: vStyle.innerBorder,
                          color: vStyle.color
                        }}
                      >
                        <span className="leading-none">{startTime}</span>
                        <span className="text-[7px] my-0.5 opacity-60">↓</span>
                        <span className="leading-none">{endTime}</span>
                      </div>

                      {/* Right Details */}
                      <div className="flex-grow p-2 flex flex-col justify-between overflow-hidden">
                        <h4 
                          className="text-[12px] font-bold truncate leading-tight text-left"
                          style={{ color: vStyle.titleColor }}
                        >
                          {s.student_name}
                        </h4>
                        <div 
                          className="text-[10px] font-bold mt-1 select-none leading-none text-left"
                          style={{ color: vStyle.priceColor }}
                        >
                          {formatVND(s.price)}
                        </div>
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

import React from 'react';
import { DAYS, getEndTime, formatCleanTimeString, formatVND, Session } from '@/lib/utils';

interface CalendarMonthViewProps {
  selectedMonth: string; // "YYYY-MM"
  sessions: Session[];
  onSessionClick: (id: string) => void;
}

// Helper to convert hex to HSL colors for dynamic, themed lighting effects
function hexToHSL(hex: string) {
  // Remove '#' if present
  hex = hex.replace(/^#/, '');

  // Parse r, g, b
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

// Design helper to generate premium colored shades based on time, status and native hex color
export function getPremiumVioletStyle(timeStr: string, status: string, hexColor: string = '#7b61ff') {
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  
  // Convert HEX to HSL so we can adjust opacity, borders, and lighting systematically
  const { h: hue, s: initialSat, l: initialLight } = hexToHSL(hexColor);
  
  let sat = initialSat;
  let lightness = initialLight;

  // Status adjustments
  if (status === 'Đã dạy') {
    // Completed: Muted
    sat = Math.max(15, Math.round(initialSat * 0.45));
    lightness = isDarkMode ? 45 : 75;
  } else if (status === 'Hủy') {
    // Cancelled: Very muted/faded
    sat = Math.max(10, Math.round(initialSat * 0.25));
    lightness = isDarkMode ? 35 : 88;
  } else {
    // Active class coloring: ensure clean visibility on light and dark mode
    if (isDarkMode) {
      sat = Math.min(85, Math.max(65, initialSat));
      lightness = Math.min(75, Math.max(50, initialLight)); // keep text/borders bright
    } else {
      sat = Math.min(90, Math.max(60, initialSat));
      lightness = Math.min(65, Math.max(45, initialLight)); // keep text dark enough
    }
  }

  if (isDarkMode) {
    // Dark Mode Event Card styling spec:
    // Semi-transparent bg (10-18% opacity), accent color border, soft outer glow
    const alphaBg = status === 'Hủy' ? '0.04' : status === 'Đã dạy' ? '0.10' : '0.14';
    const bg = `hsla(${hue}, ${sat}%, ${lightness}%, ${alphaBg})`;
    const border = `hsla(${hue}, ${sat}%, ${lightness}%, 0.65)`;
    const color = `hsla(${hue}, 90%, 90%, 0.95)`;
    const shadow = status === 'Hủy' ? 'none' : `0 0 20px hsla(${hue}, ${sat}%, ${lightness}%, 0.15)`;

    return {
      bg,
      border,
      innerBorder: `hsla(${hue}, ${sat}%, ${lightness}%, 0.25)`,
      color,
      titleColor: '#F8FAFC',
      priceColor: color,
      shadow
    };
  } else {
    // Light Mode Event Card styling spec:
    // White card with light tinted bg, colored left border, tiny shadow/soft glow
    const bg = status === 'Hủy' ? 'rgba(250, 250, 251, 0.6)' : `hsla(${hue}, ${sat}%, 97%, 0.85)`;
    const border = 'rgba(0, 0, 0, 0.05)';
    const borderLeft = `4px solid hsla(${hue}, ${sat}%, ${lightness}%, 0.95)`;
    const color = `hsla(${hue}, ${sat}%, ${lightness - 10}%, 1)`;
    const shadow = status === 'Hủy' ? 'none' : `0 6px 20px hsla(${hue}, ${sat}%, 70%, 0.06)`;

    return {
      bg,
      border,
      borderLeft,
      innerBorder: 'rgba(0, 0, 0, 0.04)',
      color,
      titleColor: '#111827',
      priceColor: color,
      shadow
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
                  const vStyle = getPremiumVioletStyle(s.time, s.status, s.color);

                  return (
                    <div
                      key={s.id}
                      onClick={() => onSessionClick(s.id)}
                      className="flex rounded-xl cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all active:scale-[0.98] min-h-[58px] border event-float"
                      style={{
                        backgroundColor: vStyle.bg,
                        borderColor: vStyle.border,
                        borderLeft: vStyle.borderLeft,
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

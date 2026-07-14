import React from 'react';
import { DAYS, getEndTime, formatCleanTimeString, formatVND, getStudentColor, Session } from '@/lib/utils';

interface CalendarMonthViewProps {
  selectedMonth: string; // "YYYY-MM"
  sessions: Session[];
  onSessionClick: (id: string) => void;
}

// Helper to convert hex to HSL colors for dynamic, themed lighting effects
function hexToHSL(hex: string) {
  // Guard against null/undefined/empty values
  if (!hex || typeof hex !== 'string') {
    hex = '#7b61ff';
  }
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
  if (status === 'Hủy') {
    return {
      bg: 'rgba(148, 163, 184, 0.12)', // Visible light gray background
      border: 'rgba(148, 163, 184, 0.3)', // Visible light gray border
      innerBorder: 'rgba(148, 163, 184, 0.15)',
      color: '#94a3b8', // Slate-400 text color for time and metadata
      titleColor: '#cbd5e1', // Slate-300 text color for student name
      priceColor: '#94a3b8',
      shadow: 'none'
    };
  }

  const { h: hue, s: initialSat, l: initialLight } = hexToHSL(hexColor);
  
  let sat = initialSat;
  let lightness = initialLight;

  if (status === 'Đã dạy') {
    sat = Math.max(25, Math.round(initialSat * 0.55));
    lightness = 52;
  } else {
    sat = Math.min(90, Math.max(70, initialSat));
    lightness = Math.min(80, Math.max(55, initialLight));
  }

  const alphaBg = status === 'Đã dạy' ? '0.14' : '0.22';
  const bg = `hsla(${hue}, ${sat}%, ${lightness}%, ${alphaBg})`;
  const border = `hsla(${hue}, ${sat}%, ${lightness}%, 0.85)`;
  const color = `hsla(${hue}, 95%, 92%, 0.98)`;
  
  // High-intensity noticeable vibrant glow shadow effect matching day indicator glow
  const shadow = status === 'Đã dạy'
    ? `0 0 16px hsla(${hue}, ${sat}%, ${lightness}%, 0.40), 0 0 4px hsla(${hue}, ${sat}%, ${lightness}%, 0.80)`
    : `0 0 20px hsla(${hue}, ${sat}%, ${lightness}%, 0.65), 0 0 8px hsla(${hue}, ${sat}%, ${lightness}%, 0.90), 0 4px 14px rgba(0, 0, 0, 0.4)`;

  return {
    bg,
    border,
    innerBorder: `hsla(${hue}, ${sat}%, ${lightness}%, 0.45)`,
    color,
    titleColor: '#FFFFFF',
    priceColor: color,
    shadow
  };
}

export default function CalendarMonthView({
  selectedMonth,
  sessions,
  onSessionClick,
}: CalendarMonthViewProps) {
  const [year, month] = selectedMonth.split('-').map(Number);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (bodyRef.current && headerRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  if (!year || !month) return null;

  const firstDay = new Date(year, month - 1, 1);
  const totalDays = new Date(year, month, 0).getDate();
  const firstDayOfWeek = firstDay.getDay();
  
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
      isWeekend: i % 7 === 5 || i % 7 === 6,
    });
  }

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  return (
    <div className="w-full calendar-container-depth rounded-3xl overflow-hidden shadow-2xl relative select-none bg-[#141824]">
      {/* Signature glowing top timeline accent */}
      <div className="glowing-timeline-bar w-full" />
      
      {/* 1. Header Scroll Container (Horizontal only, no scrollbar shown) */}
      <div ref={headerRef} className="w-full overflow-hidden bg-[#1a2032] border-b border-[#2a3550]">
        <div className="min-w-[1000px] grid grid-cols-7 select-none">
          {DAYS.map((day, idx) => {
            const isWeekend = idx === 5 || idx === 6;
            return (
              <div
                key={day}
                className={`py-4 text-center text-[11px] font-extrabold uppercase tracking-widest ${
                  isWeekend ? 'text-rose-450 dark:text-rose-400 bg-rose-500/[0.03]' : 'text-slate-350'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Body Scroll Container (Vertical and Horizontal scrollable) */}
      <div ref={bodyRef} onScroll={handleScroll} className="w-full overflow-auto max-h-[620px] bg-[#101420]">
        <div className="min-w-[1000px] relative">
          
          {/* Days Grid - Distinct cell divider lines (#28334e) */}
          <div className="grid grid-cols-7 gap-[1px] bg-[#28334e]">
            {cells.map((cell) => {
              if (!cell.inMonth) {
                return (
                  <div 
                    key={`empty-${cell.index}`} 
                    className="bg-[#101420] min-h-[155px]" 
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
                  className={`min-h-[160px] p-3 transition-all flex flex-col gap-2 relative ${
                    cellIsToday 
                      ? 'bg-[#1f2042] ring-2 ring-[#5c36f5] z-10 shadow-[inset_0_0_20px_rgba(92,54,245,0.25)]' 
                      : 'bg-[#151b2a] hover:bg-[#1c2438]'
                  }`}
                >
                  {/* Day Number */}
                  <div className="flex justify-between items-center shrink-0 select-none">
                    <span
                      className={`text-[12px] font-black font-sans rounded-full flex items-center justify-center h-6.5 w-6.5 ${
                        cellIsToday
                          ? 'bg-[#5c36f5] text-white shadow-[0_0_16px_rgba(92,54,245,0.9)] ring-2 ring-white/30'
                          : 'text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {daySessions.length > 0 && (
                      <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                        {daySessions.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Day Session Cards */}
                  <div className="flex-grow flex flex-col gap-2">
                    {daySessions.map((s) => {
                      const startTime = formatCleanTimeString(s.time);
                      const endTime = getEndTime(startTime, s.duration);
                      const vStyle = getPremiumVioletStyle(s.time, s.status, s.color || getStudentColor(s.student_name));

                      return (
                        <div
                          key={s.id}
                          onClick={() => onSessionClick(s.id)}
                          className="flex rounded-xl cursor-pointer transition-all active:scale-[0.98] min-h-[52px] border border-solid event-float overflow-hidden"
                          style={{
                            backgroundColor: vStyle.bg,
                            borderColor: vStyle.border,
                            boxShadow: vStyle.shadow
                          }}
                        >
                          {/* Left Time Bar */}
                          <div
                            className="flex flex-col justify-center items-center px-2 py-1 text-[9px] font-black w-[48px] select-none text-center border-r border-solid"
                            style={{ 
                              borderColor: vStyle.innerBorder,
                              color: vStyle.color
                            }}
                          >
                            <span className="leading-none">{startTime}</span>
                            <span className="text-[7px] my-0.5 opacity-50">↓</span>
                            <span className="leading-none">{endTime}</span>
                          </div>

                           {/* Right Details: Displays ONLY student name & status */}
                          <div className="flex-grow p-2 flex flex-col justify-center overflow-hidden">
                            <h4 
                              className="text-[12px] font-black truncate leading-tight text-left tracking-tight text-white"
                            >
                              {s.student_name}
                            </h4>
                            <div 
                              className="text-[9.5px] font-bold mt-0.5 select-none leading-none text-left opacity-90"
                              style={{ color: vStyle.color }}
                            >
                              {s.status}
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
      </div>
    </div>
  );
}

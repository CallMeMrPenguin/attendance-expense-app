import React from 'react';
import { Clock } from 'lucide-react';
import { DAYS, getEndTime, formatCleanTimeString, formatVND, Session } from '@/lib/utils';
import { getPremiumVioletStyle } from './CalendarMonthView';

interface CalendarWeekViewProps {
  sessions: Session[];
  onSessionClick: (id: string) => void;
}

export default function CalendarWeekView({ sessions, onSessionClick }: CalendarWeekViewProps) {
  // Extract and sort all unique start times across the sessions
  const timeSlots = Array.from(
    new Set(sessions.map((s) => formatCleanTimeString(s.time)))
  ).sort();

  // Find a date for each weekday from the sessions list
  const getDayDateString = (dayName: string) => {
    const sessionForDay = sessions.find(s => s.day_of_week === dayName);
    if (sessionForDay && sessionForDay.date) {
      const parts = sessionForDay.date.split('-'); // YYYY-MM-DD
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
    }
    
    // Fallback: calculate using the active month
    const firstSess = sessions[0];
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    if (firstSess && firstSess.date) {
      const parts = firstSess.date.split('-');
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
    }
    
    const dayIndices: Record<string, number> = {
      'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3, 'Thứ 5': 4, 'Thứ 6': 5, 'Thứ 7': 6, 'Chủ nhật': 0
    };
    const targetDayIndex = dayIndices[dayName] !== undefined ? dayIndices[dayName] : 1;
    
    const firstDayOfMonth = new Date(year, month - 1, 1);
    let offset = targetDayIndex - firstDayOfMonth.getDay();
    if (offset < 0) offset += 7;
    const date = new Date(year, month - 1, 1 + offset);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const getTodayDayName = () => {
    const dayNum = new Date().getDay();
    const map: Record<number, string> = {
      1: 'Thứ 2',
      2: 'Thứ 3',
      3: 'Thứ 4',
      4: 'Thứ 5',
      5: 'Thứ 6',
      6: 'Thứ 7',
      0: 'Chủ nhật',
    };
    return map[dayNum] || 'Thứ 2';
  };
  
  const todayDayName = getTodayDayName();
  const isTodayColumn = (dayName: string) => dayName === todayDayName;

  if (timeSlots.length === 0) {
    return (
      <div className="text-center py-20 text-slate-300 select-none bg-[#151b2a] border border-[#28334e] rounded-3xl p-8">
        Không có dữ liệu lịch dạy trong tuần.
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto rounded-3xl border border-white/10 shadow-2xl relative max-h-[680px] scrollbar-thin">
      <div className="min-w-[1000px] select-none relative bg-[#101420]">
        {/* Signature glowing top timeline accent */}
        <div className="glowing-timeline-bar w-full sticky top-0 z-30" />

        {/* Grid Header */}
        <div className="grid grid-cols-[100px_repeat(7,_minmax(0,_1fr))] bg-[#1a2032] border-b border-[#28334e] select-none sticky top-0 z-20 shadow-md">
        <div className="py-4 px-2 flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase text-slate-300 tracking-wider border-r border-[#28334e]">
          <Clock className="h-3.5 w-3.5 text-indigo-400" />
          Giờ
        </div>
        {DAYS.map((day, idx) => {
          const isWeekend = idx === 5 || idx === 6;
          const cellIsToday = isTodayColumn(day);

          return (
            <div
              key={day}
              className={`py-3.5 text-center text-[11px] font-extrabold uppercase tracking-widest flex flex-col items-center justify-center gap-0.5 border-r border-[#28334e] last:border-r-0 transition-all ${
                cellIsToday 
                  ? 'bg-[#7b61ff] text-white font-black shadow-[0_0_20px_rgba(123,97,255,0.85)] ring-2 ring-white/30 z-10' 
                  : isWeekend 
                    ? 'text-rose-400' 
                    : 'text-slate-300'
              }`}
            >
              <span>{day}</span>
              <span className={`text-[9.5px] font-bold normal-case ${cellIsToday ? 'text-white/90' : 'opacity-65'}`}>
                {getDayDateString(day)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Grid Rows - Divider color #28334e */}
      <div className="divide-y divide-[#28334e] bg-[#151b2a]">
        {timeSlots.map((slot) => {
          return (
            <div
              key={slot}
              className="grid grid-cols-[100px_repeat(7,_minmax(0,_1fr))] min-h-[105px]"
            >
              {/* Hour time slot */}
              <div className="relative px-3 flex items-center justify-center font-black text-xs text-slate-300 bg-[#121624] border-r border-[#28334e] select-none">
                {slot}
              </div>

              {/* Day columns */}
              {DAYS.map((day) => {
                const cellIsToday = isTodayColumn(day);
                const slotSessions = sessions.filter(
                  (s) => s.day_of_week === day && formatCleanTimeString(s.time) === slot
                );

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
                    className={`p-2.5 border-r border-[#28334e] last:border-r-0 flex flex-col gap-2 overflow-y-auto max-h-[150px] custom-scrollbar transition-colors ${
                      cellIsToday 
                        ? 'bg-[#212349] border-x border-[#7b61ff]/40 shadow-[inset_0_0_20px_rgba(123,97,255,0.18)]' 
                        : 'bg-[#151b2a] hover:bg-[#1c2438]'
                    }`}
                  >
                    {Object.values(grouped).map((group) => {
                      const s = group[0];
                      const startTime = formatCleanTimeString(s.time);
                      const endTime = getEndTime(startTime, s.duration);
                      const vStyle = getPremiumVioletStyle(s.time, s.status, s.color);

                      return (
                        <div
                          key={s.id}
                          onClick={() => onSessionClick(s.id)}
                          className="flex rounded-xl cursor-pointer transition-all active:scale-[0.98] min-h-[56px] border border-solid event-float overflow-hidden"
                          style={{
                            backgroundColor: vStyle.bg,
                            borderColor: vStyle.border,
                            boxShadow: vStyle.shadow
                          }}
                        >
                          {/* Time Column inside card */}
                          <div
                            className="flex flex-col justify-center items-center px-2 py-1 text-[9px] font-black w-[48px] select-none text-center border-r"
                            style={{ 
                              borderColor: vStyle.innerBorder,
                              color: vStyle.color
                            }}
                          >
                            <span className="leading-none">{startTime}</span>
                            <span className="text-[7px] my-0.5 opacity-60">↓</span>
                            <span className="leading-none">{endTime}</span>
                          </div>

                          {/* Info Column */}
                          <div className="flex-grow p-2 flex flex-col justify-between overflow-hidden">
                            <h4 
                              className="text-[12px] font-black truncate leading-tight text-left tracking-tight text-white"
                            >
                              {s.student_name}
                            </h4>
                            <div 
                              className="text-[10px] font-extrabold mt-0.5 select-none leading-none text-left"
                              style={{ color: vStyle.priceColor }}
                            >
                              {formatVND(s.price)}
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
  </div>
  );
}




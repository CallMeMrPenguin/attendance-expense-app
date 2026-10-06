import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { DAYS, getEndTime, formatCleanTimeString, formatVND, getStudentColor, Session } from '@/lib/utils';
import { getPremiumVioletStyle } from './CalendarMonthView';

interface CalendarWeekViewProps {
  selectedMonth?: string; // "YYYY-MM"
  sessions: Session[];
  onSessionClick: (id: string) => void;
  onAddSessionOnDate?: (dateStr: string) => void;
}

interface WeekDayInfo {
  dayName: string;
  dateStr: string; // "YYYY-MM-DD"
  displayDate: string; // "DD/MM"
  isToday: boolean;
  isCurrentMonth: boolean;
}

interface WeekInfo {
  index: number;
  label: string;
  rangeText: string;
  days: WeekDayInfo[];
}

export default function CalendarWeekView({
  selectedMonth,
  sessions,
  onSessionClick,
  onAddSessionOnDate,
}: CalendarWeekViewProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (bodyRef.current && headerRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  // Determine active year and month
  const { year, month } = useMemo(() => {
    if (selectedMonth && /^\d{4}-\d{2}$/.test(selectedMonth)) {
      const [y, m] = selectedMonth.split('-').map(Number);
      return { year: y, month: m };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [selectedMonth]);

  // Today string "YYYY-MM-DD"
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Compute all weeks in the selected month
  const weeks = useMemo<WeekInfo[]>(() => {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);

    // Monday of the week containing the 1st of the month
    // In JS: 0=Sun, 1=Mon, ..., 6=Sat
    const fDay = firstDayOfMonth.getDay();
    const mondayOffset = fDay === 0 ? -6 : 1 - fDay;
    const firstMonday = new Date(year, month - 1, 1 + mondayOffset);

    const weekList: WeekInfo[] = [];
    let curMonday = new Date(firstMonday);
    let wIdx = 0;

    while (curMonday <= lastDayOfMonth || wIdx === 0) {
      const days: WeekDayInfo[] = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(curMonday.getFullYear(), curMonday.getMonth(), curMonday.getDate() + i);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        const dStr = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yStr}-${mStr}-${dStr}`;
        const displayDate = `${dStr}/${mStr}`;
        const isToday = dateStr === todayStr;
        const isCurrentMonth = d.getMonth() + 1 === month && d.getFullYear() === year;

        days.push({
          dayName: DAYS[i],
          dateStr,
          displayDate,
          isToday,
          isCurrentMonth,
        });
      }

      const startDay = days[0].displayDate;
      const endDay = days[6].displayDate;

      weekList.push({
        index: wIdx,
        label: `Tuần ${wIdx + 1}`,
        rangeText: `${startDay} - ${endDay}`,
        days,
      });

      wIdx++;
      curMonday = new Date(curMonday.getFullYear(), curMonday.getMonth(), curMonday.getDate() + 7);
      if (wIdx >= 6) break; // safety break
    }

    return weekList;
  }, [year, month, todayStr]);

  // Find initial week index (week containing today if in selected month, else 0)
  const defaultWeekIndex = useMemo(() => {
    const todayWeekIdx = weeks.findIndex((w) => w.days.some((d) => d.dateStr === todayStr));
    return todayWeekIdx >= 0 ? todayWeekIdx : 0;
  }, [weeks, todayStr]);

  const [activeWeekIndex, setActiveWeekIndex] = useState(defaultWeekIndex);

  // Sync active week when month changes
  useEffect(() => {
    setActiveWeekIndex(defaultWeekIndex);
  }, [defaultWeekIndex]);

  const currentWeek = weeks[activeWeekIndex] || weeks[0];

  // Sessions for the current week only
  const currentWeekDates = useMemo(() => {
    return new Set((currentWeek?.days || []).map((d) => d.dateStr));
  }, [currentWeek]);

  const weekSessions = useMemo(() => {
    return sessions.filter((s) => s.date && currentWeekDates.has(s.date));
  }, [sessions, currentWeekDates]);

  // Extract time slots from sessions of this week, supplemented by month sessions or sensible defaults
  const timeSlots = useMemo(() => {
    const weekTimes = new Set(weekSessions.map((s) => formatCleanTimeString(s.time)));
    if (weekTimes.size === 0) {
      // Check if any month sessions exist
      const monthTimes = sessions.map((s) => formatCleanTimeString(s.time));
      monthTimes.forEach((t) => weekTimes.add(t));
    }
    // Fallback standard slots if no sessions exist
    if (weekTimes.size === 0) {
      return ['08:00', '10:00', '14:00', '16:00', '18:00', '19:30'];
    }
    return Array.from(weekTimes).sort();
  }, [weekSessions, sessions]);

  const handlePrevWeek = () => {
    if (activeWeekIndex > 0) {
      setActiveWeekIndex((prev) => prev - 1);
    }
  };

  const handleNextWeek = () => {
    if (activeWeekIndex < weeks.length - 1) {
      setActiveWeekIndex((prev) => prev + 1);
    }
  };

  const hasTodayInMonth = weeks.some((w) => w.days.some((d) => d.dateStr === todayStr));

  return (
    <div className="w-full space-y-3">
      {/* 1. Week Navigation & Selector Bar (Rule 7 Segmented Control & Navigation) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121626] border border-white/10 rounded-2xl p-2.5 px-4 shadow-lg">
        {/* Left: Previous / Next Week Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevWeek}
            disabled={activeWeekIndex === 0}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Tuần trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-xs font-black text-white px-2">
            {currentWeek?.label} ({currentWeek?.rangeText})
          </span>

          <button
            type="button"
            onClick={handleNextWeek}
            disabled={activeWeekIndex === weeks.length - 1}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Tuần sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Center: Week Pills Segmented Control (Rule 7) */}
        {weeks.length > 1 && (
          <div className="relative flex bg-[#0d1018] p-1 rounded-xl border border-white/10 text-xs shrink-0 font-bold select-none min-w-[260px] sm:min-w-[320px]">
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-[#5c36f5] shadow-[0_0_14px_rgba(92,54,245,0.5)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none"
              style={{
                left: activeWeekIndex === 0 ? '4px' : `calc( (100% / ${weeks.length}) * ${activeWeekIndex} + 1px )`,
                width: `calc( (100% / ${weeks.length}) - 4px )`,
              }}
            />
            {weeks.map((w, idx) => {
              const isActive = idx === activeWeekIndex;
              return (
                <button
                  key={w.label}
                  type="button"
                  onClick={() => setActiveWeekIndex(idx)}
                  className={`flex-1 relative z-10 py-1 text-center transition-colors cursor-pointer text-[11px] font-black ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Right: Jump to Today button if today is in this month */}
        {hasTodayInMonth && (
          <button
            type="button"
            onClick={() => setActiveWeekIndex(defaultWeekIndex)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeWeekIndex === defaultWeekIndex
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5'
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5 text-indigo-400" />
            <span>Tuần Này</span>
          </button>
        )}
      </div>

      {/* 2. Main Week Calendar Grid */}
      <div className="w-full calendar-container-depth rounded-3xl overflow-hidden shadow-2xl relative select-none bg-[#141824] border border-[#28334e]">
        {/* Signature glowing top timeline accent */}
        <div className="glowing-timeline-bar w-full" />

        {/* Header Scroll Container */}
        <div ref={headerRef} className="w-full overflow-hidden bg-[#1a2032] border-b border-[#28334e]">
          <div className="min-w-[1000px] grid grid-cols-[100px_repeat(7,_minmax(0,_1fr))] select-none">
            <div className="py-4 px-2 flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase text-slate-300 tracking-wider border-r border-[#28334e]">
              <Clock className="h-3.5 w-3.5 text-indigo-400" />
              Giờ
            </div>
            {(currentWeek?.days || []).map((dayInfo, idx) => {
              const isWeekend = idx === 5 || idx === 6;
              const cellIsToday = dayInfo.isToday;
              return (
                <div
                  key={dayInfo.dateStr}
                  className={`py-3.5 text-center text-[11px] font-extrabold uppercase tracking-widest flex flex-col items-center justify-center gap-0.5 last:border-r-0 transition-all ${
                    cellIsToday
                      ? 'bg-[#1a2032] border-x-2 border-t-2 border-x-[#5c36f5] border-t-[#5c36f5] z-10 text-white font-black shadow-[inset_0_0_30px_rgba(92,54,245,0.15)]'
                      : `border-r border-[#28334e] ${isWeekend ? 'text-rose-400 bg-rose-500/[0.02]' : 'text-slate-300'}`
                  }`}
                >
                  <span className={cellIsToday ? 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.9)] font-black' : ''}>
                    {dayInfo.dayName}
                  </span>
                  <span
                    className={`text-[10px] font-black normal-case ${
                      cellIsToday
                        ? 'text-indigo-300 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]'
                        : dayInfo.isCurrentMonth
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    {dayInfo.displayDate}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body Scroll Container */}
        <div ref={bodyRef} onScroll={handleScroll} className="w-full overflow-auto max-h-[620px] bg-[#101420] custom-scrollbar">
          <div className="min-w-[1000px] relative bg-[#101420]">
            <div className="divide-y divide-[#28334e] bg-[#151b2a]">
              {timeSlots.map((slot, slotIdx) => {
                const isLastSlot = slotIdx === timeSlots.length - 1;
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
                    {(currentWeek?.days || []).map((dayInfo) => {
                      const cellIsToday = dayInfo.isToday;
                      const slotSessions = weekSessions.filter(
                        (s) => s.date === dayInfo.dateStr && formatCleanTimeString(s.time) === slot
                      );

                      return (
                        <div
                          key={`${slot}-${dayInfo.dateStr}`}
                          className={`p-2.5 flex flex-col gap-2 overflow-y-auto max-h-[160px] custom-scrollbar transition-colors relative group/cell ${
                            cellIsToday
                              ? `bg-[#1f2042]/30 shadow-[inset_0_0_35px_rgba(92,54,245,0.12)] border-x-2 border-x-[#5c36f5] z-10 ${
                                  isLastSlot ? 'border-b-2 border-b-[#5c36f5]' : ''
                                }`
                              : 'bg-[#151b2a] hover:bg-[#1a2235] border-r border-[#28334e] last:border-r-0'
                          }`}
                        >
                          {slotSessions.length > 0 ? (
                            slotSessions.map((s) => {
                              const startTime = formatCleanTimeString(s.time);
                              const endTime = getEndTime(startTime, s.duration);
                              const jobName = s.job_name || s.student_name || '';
                              const vStyle = getPremiumVioletStyle(s.time, s.status, s.color || getStudentColor(jobName));
                              const isDone = s.status === 'Đã làm' || s.status === 'Đã dạy';
                              const isCancel = s.status === 'Hủy';

                              return (
                                <div
                                  key={s.id || `session-${s.date}-${s.time}`}
                                  onClick={() => onSessionClick(s.id)}
                                  className={`flex rounded-xl cursor-pointer transition-all active:scale-[0.98] min-h-[56px] border border-solid overflow-hidden shrink-0 ${
                                    isCancel 
                                      ? 'opacity-60 hover:opacity-90' 
                                      : isDone 
                                      ? 'hover:brightness-105' 
                                      : 'event-float shadow-md hover:brightness-110'
                                  }`}
                                  style={{
                                    backgroundColor: vStyle.bg,
                                    borderColor: vStyle.border,
                                    boxShadow: vStyle.shadow,
                                    opacity: vStyle.opacity,
                                  }}
                                  title={`Bấm để chỉnh sửa: ${jobName} (${s.status})`}
                                >
                                  {/* Time Column inside card */}
                                  <div
                                    className="flex flex-col justify-center items-center px-2 py-1 text-[9px] font-black w-[48px] select-none text-center border-r shrink-0"
                                    style={{
                                      borderColor: vStyle.innerBorder,
                                      color: vStyle.color,
                                    }}
                                  >
                                    <span className="leading-none">{startTime}</span>
                                    <span className="text-[7px] my-0.5 opacity-60">↓</span>
                                    <span className="leading-none">{endTime}</span>
                                  </div>

                                  {/* Info Column */}
                                  <div className="flex-grow p-2 flex flex-col justify-between overflow-hidden">
                                    <div className="flex items-center justify-between gap-1">
                                      <h4 
                                        className={`text-[12px] font-black truncate leading-tight text-left tracking-tight ${
                                          isCancel ? 'line-through text-slate-500' : ''
                                        }`}
                                        style={{ color: isCancel ? undefined : vStyle.titleColor }}
                                      >
                                        {jobName}
                                      </h4>
                                      {(s.student_count ?? 1) < (s.original_student_count ?? (s.student_count ?? 1)) ? (
                                        <span
                                          className="text-[8px] font-black px-1 py-0.2 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40 animate-pulse shrink-0"
                                          title={`Giảm ${(s.original_student_count || 0) - (s.student_count || 0)} HS vắng mặt`}
                                        >
                                          {s.student_count}/{s.original_student_count} HS
                                        </span>
                                      ) : (s.student_count ?? 1) > 1 ? (
                                        <span className={`text-[8px] font-black px-1 py-0.2 rounded shrink-0 ${
                                          isCancel 
                                            ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' 
                                            : isDone 
                                            ? 'bg-white/10 text-white/90 border border-white/15'
                                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                        }`}>
                                          {s.student_count} HS
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className="flex items-center justify-between mt-1">
                                      <span
                                        className="text-[10px] font-extrabold select-none leading-none text-left"
                                        style={{
                                          color:
                                            (s.student_count ?? 1) < (s.original_student_count ?? (s.student_count ?? 1))
                                              ? '#fbbf24'
                                              : vStyle.priceColor,
                                        }}
                                      >
                                        {formatVND(s.price)}
                                      </span>

                                      <span
                                        className={`text-[8.5px] font-black px-1.5 py-0.5 rounded ${
                                          isDone
                                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                                            : isCancel
                                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25 line-through'
                                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        }`}
                                      >
                                        {s.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            /* Empty Cell: Click to Add */
                            onAddSessionOnDate && (
                              <button
                                type="button"
                                onClick={() => onAddSessionOnDate(dayInfo.dateStr)}
                                className="w-full h-full min-h-[56px] flex items-center justify-center rounded-xl opacity-0 group-hover/cell:opacity-100 hover:bg-white/5 border border-dashed border-white/10 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-300 transition-all cursor-pointer"
                                title={`Thêm ca dạy ngày ${dayInfo.displayDate}`}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { formatDateVN } from '@/lib/utils';

interface CustomDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
}

export default function CustomDatePicker({ value, onChange }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Calculate starting index offset (where Sunday = 0, Monday = 1, etc.)
  // Vietnamese calendar style: Let's start with Monday (T2) at column 0, Sunday (CN) at column 6!
  // This matches standard VN UI. Let's look at getDay() where Sunday = 0, Monday = 1, ..., Saturday = 6.
  // We want to transform it so Mon = 0, Tue = 1, ..., Sun = 6.
  const firstDay = new Date(currentYear, currentMonth, 1);
  const dayOfWeek = firstDay.getDay(); // Sun = 0, Mon = 1, ..., Sat = 6
  const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const daysArray: (number | null)[] = [];
  // Fill initial blank cells
  for (let i = 0; i < startOffset; i++) {
    daysArray.push(null);
  }
  // Fill days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(i);
  }

  const handleSelectDay = (day: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${mm}-${dd}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const isSelectedDate = (day: number) => {
    if (!value) return false;
    const d = new Date(value);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === day;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between bg-[#0d1018] border border-white/10 hover:border-indigo-500/40 text-white text-xs font-bold rounded-xl px-3.5 py-2.5 cursor-pointer transition-all block text-left"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>{value ? formatDateVN(value) : 'Chọn ngày...'}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full mt-2 left-0 z-[200] w-64 bg-[#0d1018] border border-white/10 rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-4 backdrop-blur-xl animate-mac-dropdown origin-top-left text-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 select-none">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-black text-white uppercase tracking-wider">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-1.5 text-[9px] font-black uppercase text-slate-500 tracking-wider select-none">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
              <div key={d} className={d === 'CN' ? 'text-rose-450' : ''}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysArray.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="py-1" />;
              }
              const active = isSelectedDate(day);
              const isWeekendCell = idx % 7 === 5 || idx % 7 === 6;
              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={(e) => handleSelectDay(day, e)}
                  className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    active
                      ? 'bg-[#5c36f5] text-white shadow-[0_0_10px_rgba(92,54,245,0.5)] cursor-pointer'
                      : isWeekendCell
                        ? 'text-rose-450 hover:bg-white/[0.06] cursor-pointer'
                        : 'text-slate-350 hover:bg-white/[0.06] hover:text-white cursor-pointer'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

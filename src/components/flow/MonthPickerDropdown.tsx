import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthPickerDropdownProps {
  chartSelectedMonths: string[];
  toggleChartMonth?: (mStr: string) => void;
}

export const MonthPickerDropdown: React.FC<MonthPickerDropdownProps> = ({
  chartSelectedMonths,
  toggleChartMonth,
}) => {
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(() => {
    if (chartSelectedMonths && chartSelectedMonths.length > 0) {
      return parseInt(chartSelectedMonths[0].split('-')[0], 10) || new Date().getFullYear();
    }
    return new Date().getFullYear();
  });

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-picker]')) {
        setMonthPickerOpen(false);
      }
    };
    if (monthPickerOpen) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [monthPickerOpen]);

  return (
    <div className="relative" data-picker>
      <button
        type="button"
        onClick={() => setMonthPickerOpen(o => !o)}
        className="flex items-center gap-2 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-white text-xs font-bold rounded-xl px-3.5 py-2 cursor-pointer transition-all shadow-lg"
      >
        <CalendarIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
        <span>
          {chartSelectedMonths.length === 1 
            ? `Tháng ${chartSelectedMonths[0].split('-')[1]}/${chartSelectedMonths[0].split('-')[0]}` 
            : `${chartSelectedMonths.length} tháng được chọn`
          }
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${monthPickerOpen ? 'rotate-180' : ''}`} />
      </button>

      {monthPickerOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-[#0d1018] border border-white/10 rounded-2xl p-3 shadow-[0_20px_60px_rgba(0,0,0,0.9)] w-64 animate-mac-dropdown">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
            <span className="text-xs font-black text-slate-300">Chọn Tháng So Sánh</span>
            <div className="flex items-center gap-1">
              <button 
                type="button"
                onClick={() => setPickerYear(y => y - 1)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-bold text-indigo-400">{pickerYear}</span>
              <button 
                type="button"
                onClick={() => setPickerYear(y => y + 1)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'].map((mn, i) => {
              const mNum = String(i + 1).padStart(2, '0');
              const val = `${pickerYear}-${mNum}`;
              const isActive = chartSelectedMonths.includes(val);
              const currentDate = new Date();
              const curY = currentDate.getFullYear();
              const curM = currentDate.getMonth() + 1;
              const isFuture = pickerYear > curY || (pickerYear === curY && (i + 1) > curM);

              return (
                <button
                  key={mn}
                  type="button"
                  disabled={isFuture}
                  onClick={() => toggleChartMonth?.(val)}
                  className={`py-1.5 text-xs font-bold rounded-xl transition-all ${
                    isFuture
                      ? 'text-slate-700 bg-transparent cursor-not-allowed opacity-30'
                      : isActive
                        ? 'bg-[#5c36f5] text-white shadow-[0_0_12px_rgba(92,54,245,0.5)] cursor-pointer'
                        : 'text-slate-400 hover:bg-white/[0.06] hover:text-white cursor-pointer'
                  }`}
                >
                  {mn}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthPickerDropdown;

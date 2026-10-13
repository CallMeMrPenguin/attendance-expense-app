import React from 'react';
import { FileText, CalendarDays, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { DAYS, formatDateVN, formatCleanTimeString, getEndTime } from '@/lib/utils';
import CustomDatePicker from '../CustomDatePicker';

interface SiblingCheck {
  id?: string;
  checked: boolean;
  date: string;
  day_of_week: string;
  time: string;
  duration: number;
}

interface RecurringDayConfig {
  checked: boolean;
  time: string;
  duration: number;
}

interface SessionRecurringConfigsSectionProps {
  currentSessionId?: string;
  siblings: SiblingCheck[];
  siblingsCollapsed: boolean;
  setSiblingsCollapsed: (val: boolean) => void;
  onSiblingCheck: (idOrDate: string, checked: boolean) => void;
  onSwitchSession?: (id: string) => void;
  recurringCollapsed: boolean;
  setRecurringCollapsed: (val: boolean) => void;
  recurringConfigs: Record<string, RecurringDayConfig>;
  onRecurringCheck: (day: string, checked: boolean) => void;
  onRecurringTimeChange: (day: string, time: string) => void;
  onRecurringDurationChange: (day: string, duration: number) => void;
  onAddSiblingSession?: (date: string, time: string, duration: number) => void;
}

export const SessionRecurringConfigsSection: React.FC<SessionRecurringConfigsSectionProps> = ({
  currentSessionId,
  siblings,
  siblingsCollapsed,
  setSiblingsCollapsed,
  onSiblingCheck,
  onSwitchSession,
  recurringCollapsed,
  setRecurringCollapsed,
  recurringConfigs,
  onRecurringCheck,
  onRecurringTimeChange,
  onRecurringDurationChange,
  onAddSiblingSession,
}) => {
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [extraDate, setExtraDate] = React.useState(() => {
    return siblings[0]?.date || new Date().toISOString().split('T')[0];
  });
  const [extraTime, setExtraTime] = React.useState('18:00');
  const [extraDuration, setExtraDuration] = React.useState(2);

  return (
    <>
      {/* Block 2: Collapsible Sibling Sessions List */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setSiblingsCollapsed(!siblingsCollapsed)}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 flex justify-between items-center transition-colors select-none font-bold text-xs tracking-wider uppercase text-slate-700 dark:text-slate-300"
        >
          <span className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-indigo-500" />
            Buổi học trong tháng ({siblings.length})
          </span>
          {siblingsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>

        {!siblingsCollapsed && (
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 space-y-3">
            <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-1">
              {siblings.map((sib) => {
                const isCurrent = sib.id === currentSessionId;
                return (
                  <div
                    key={sib.id || sib.date}
                    className={`flex items-center justify-between gap-2.5 p-2 rounded-xl border ${
                      isCurrent
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/25 border-indigo-150 dark:border-indigo-900/40'
                        : 'bg-slate-50/40 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer flex-grow overflow-hidden">
                      <input
                        type="checkbox"
                        checked={sib.checked}
                        onChange={(e) => onSiblingCheck(sib.id || sib.date, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-350 dark:border-slate-700 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className={`text-xs font-semibold truncate ${isCurrent ? 'text-indigo-950 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {formatDateVN(sib.date)} ({formatCleanTimeString(sib.time)} - {getEndTime(sib.time, sib.duration)})
                        {isCurrent ? ' (Đang mở)' : ''}
                      </span>
                    </label>
                    {!isCurrent && onSwitchSession && sib.id && (
                      <button
                        type="button"
                        onClick={() => onSwitchSession(sib.id!)}
                        className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-lg transition-colors cursor-pointer select-none whitespace-nowrap"
                      >
                        Chi tiết
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Add Extra Session Inline */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              {!showAddForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer select-none"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Thêm Buổi Học Bù / Buổi Lẻ Vào Ngày Khác</span>
                </button>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-indigo-500/30 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-indigo-400 tracking-wider">
                      Thêm 1 Buổi Lẻ / Học Bù
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">Ngày học *</label>
                      <CustomDatePicker
                        value={extraDate}
                        onChange={(d) => setExtraDate(d)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">Giờ học *</label>
                      <input
                        type="time"
                        value={extraTime}
                        onChange={(e) => setExtraTime(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">Số giờ dạy *</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={extraDuration}
                        onChange={(e) => setExtraDuration(parseFloat(e.target.value) || 2)}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 text-center"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (onAddSiblingSession && extraDate) {
                          onAddSiblingSession(extraDate, extraTime, extraDuration);
                          setShowAddForm(false);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5c36f5] hover:bg-[#7351f7] text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Thêm Vào Danh Sách</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Block 3: Collapsible Recurring Week Schedule */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setRecurringCollapsed(!recurringCollapsed)}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 flex justify-between items-center transition-colors select-none font-bold text-xs tracking-wider uppercase text-slate-700 dark:text-slate-300"
        >
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-indigo-500" />
            Lịch học định kỳ
          </span>
          {recurringCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>

        {!recurringCollapsed && (
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 space-y-3">
            <p className="text-slate-450 dark:text-slate-500 text-[10px] leading-tight">
              Điều chỉnh lịch học định kỳ trong tuần để tự động tái tạo (thêm/xóa) các buổi dạy trong tháng:
            </p>
            <div className="space-y-2">
              {DAYS.map((day) => {
                const config = recurringConfigs[day];
                if (!config) return null;
                return (
                  <div
                    key={day}
                    className={`flex flex-wrap items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      config.checked
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40'
                        : 'bg-slate-50/40 dark:bg-slate-950/30 border-slate-200/50 dark:border-slate-850'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs min-w-[80px]">
                      <input
                        type="checkbox"
                        checked={config.checked}
                        onChange={(e) => onRecurringCheck(day, e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-350 dark:border-slate-700 text-indigo-650 focus:ring-indigo-500"
                      />
                      <span className={config.checked ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-550 dark:text-slate-455'}>
                        {day}
                      </span>
                    </label>

                    <div className="flex items-center gap-2 flex-grow justify-end md:justify-start">
                      <input
                        type="time"
                        value={config.time}
                        disabled={!config.checked}
                        onChange={(e) => onRecurringTimeChange(day, e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold disabled:opacity-50 w-[100px] text-slate-800 dark:text-slate-200"
                      />

                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Số giờ:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={config.duration}
                        disabled={!config.checked}
                        onChange={(e) => onRecurringDurationChange(day, parseFloat(e.target.value) || 2)}
                        className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold disabled:opacity-50 w-[60px] text-center text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SessionRecurringConfigsSection;

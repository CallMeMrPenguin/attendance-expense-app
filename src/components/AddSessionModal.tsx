import React, { useState } from 'react';
import { X, Calendar, Plus, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DAYS, getDatesForWeekday, checkOverlaps, getStudentColor, formatCleanTimeString, getEndTime, formatDateVN, Session } from '@/lib/utils';

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTeacherName: string;
  selectedMonth: string; // "YYYY-MM"
  existingSessions: Session[];
  onSave: () => void;
}

interface DayConfig {
  checked: boolean;
  time: string;
  duration: number;
}

const PALETTE = [
  '#7c3aed', // Vivid Purple Violet
  '#0ea5e9', // Sky Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber Gold
  '#ec4899', // Hot Pink
  '#06b6d4', // Cyan Teal
  '#f97316', // Bright Orange
  '#84cc16', // Lime Green
  '#a78bfa', // Lavender
  '#fb7185', // Rose Red
];

export default function AddSessionModal({
  isOpen,
  onClose,
  activeTeacherName,
  selectedMonth,
  existingSessions,
  onSave,
}: AddSessionModalProps) {
  const [studentName, setStudentName] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('Chưa dạy');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [color, setColor] = useState('#7c3aed');
  const [isColorCustomized, setIsColorCustomized] = useState(false);
  const colorInputRef = React.useRef<HTMLInputElement>(null);

  // Initial weekday configurations (default to Mon enabled, others disabled)
  const [dayConfigs, setDayConfigs] = useState<Record<string, DayConfig>>(
    DAYS.reduce((acc, day) => {
      acc[day] = {
        checked: day === 'Thứ 2',
        time: '18:00',
        duration: 1.5,
      };
      return acc;
    }, {} as Record<string, DayConfig>)
  );
  const [warningMsg, setWarningMsg] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingCandidates, setPendingCandidates] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleCheckboxChange = (day: string, checked: boolean) => {
    setDayConfigs((prev) => ({
      ...prev,
      [day]: { ...prev[day], checked },
    }));
  };

  const handleTimeChange = (day: string, time: string) => {
    setDayConfigs((prev) => ({
      ...prev,
      [day]: { ...prev[day], time },
    }));
  };

  const handleDurationChange = (day: string, duration: number) => {
    setDayConfigs((prev) => ({
      ...prev,
      [day]: { ...prev[day], duration },
    }));
  };

  const executeInsert = async (candidatesToInsert: any[]) => {
    setLoading(true);
    setError('');
    try {
      const { error: insertError } = await supabase
        .from('sessions')
        .insert(candidatesToInsert);

      if (insertError) {
        throw new Error(insertError.message);
      }

      setStudentName('');
      setPrice('');
      setStatus('Chưa dạy');
      setColor('#7c3aed');
      setIsColorCustomized(false);
      setShowWarningModal(false);
      
      setDayConfigs(
        DAYS.reduce((acc, day) => {
          acc[day] = {
            checked: day === 'Thứ 2',
            time: '18:00',
            duration: 1.5,
          };
          return acc;
        }, {} as Record<string, DayConfig>)
      );

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo lịch dạy.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setError('Vui lòng nhập tên học sinh.');
      return;
    }
    if (!price || Number(price) <= 0) {
      setError('Vui lòng nhập giá học phí hợp lệ.');
      return;
    }

    const selectedDays = Object.entries(dayConfigs).filter(([_, config]) => config.checked);
    if (selectedDays.length === 0) {
      setError('Vui lòng chọn ít nhất 1 thứ trong tuần!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const sessionColor = color;
      const candidates: any[] = [];

      selectedDays.forEach(([day, config]) => {
        const dates = getDatesForWeekday(selectedMonth, day);
        dates.forEach((dStr) => {
          candidates.push({
            teacher_name: activeTeacherName,
            student_name: studentName.trim(),
            day_of_week: day,
            time: formatCleanTimeString(config.time),
            duration: Number(config.duration),
            price: Number(price),
            status: status,
            grade: '',
            homework: '',
            note: '',
            month_year: selectedMonth,
            color: sessionColor,
            date: dStr,
          });
        });
      });

      const overlaps = checkOverlaps(candidates, existingSessions);
      if (overlaps.length > 0) {
        let msg = '';
        const strictOverlaps = overlaps.filter((o) => o.type === 'overlap');
        const gapWarnings = overlaps.filter((o) => o.type === 'gap');

        if (strictOverlaps.length > 0) {
          msg += 'Cảnh báo trùng lịch dạy của giáo viên:\n';
          strictOverlaps.forEach((o) => {
            msg += `- ${o.newS.student_name} (${o.newS.time}) trùng với ${o.extS.student_name} (${o.extS.time} - ${getEndTime(o.extS.time, o.extS.duration)}) vào ${formatDateVN(o.extS.date)}\n`;
          });
        }

        if (gapWarnings.length > 0) {
          msg += '\nCảnh báo ca dạy cách nhau dưới 15 phút:\n';
          gapWarnings.forEach((o) => {
            msg += `- ${o.newS.student_name} (${o.newS.time}) gần ca ${o.extS.student_name} (${o.extS.time}) vào ${formatDateVN(o.extS.date)}\n`;
          });
        }

        setPendingCandidates(candidates);
        setWarningMsg(msg);
        setShowWarningModal(true);
        setLoading(false);
        return;
      }

      await executeInsert(candidates);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo lịch dạy.');
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-[#070911]/90 z-[100] flex items-center justify-center p-4 overflow-hidden pointer-events-auto select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Overlap Warning Custom Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4">
          <div className="bg-[#121624] border border-amber-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2 text-amber-400 font-black text-base">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>Phát Hiện Trùng / Gần Lịch Dạy</span>
            </div>
            <pre className="text-xs text-slate-300 bg-slate-900/80 p-3.5 rounded-xl whitespace-pre-wrap font-sans leading-relaxed max-h-[220px] overflow-y-auto border border-white/5">
              {warningMsg}
            </pre>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={() => executeInsert(pendingCandidates)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
              >
                Vẫn Lưu Ca Dạy
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Thêm Ca Dạy Mới
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto flex flex-col">
          <div className="p-6 space-y-5 flex-grow">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="studentName" className="text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                Tên học sinh *
              </label>
              <input
                id="studentName"
                type="text"
                required
                value={studentName}
                onChange={(e) => {
                  setStudentName(e.target.value);
                  if (!isColorCustomized) {
                    setColor(getStudentColor(e.target.value.trim()));
                  }
                }}
                placeholder="VD: Nguyễn Văn Nam"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Custom Color Picker Row */}
            <div className="space-y-2">
              <label className="text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider block">
                Màu sắc hiển thị ca dạy
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {PALETTE.map((c) => {
                  const isActive = color.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setColor(c);
                        setIsColorCustomized(true);
                      }}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full transition-all cursor-pointer ${
                        isActive 
                          ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-110 shadow-lg' 
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      title={`Chọn màu ${c}`}
                    />
                  );
                })}
                
                {/* Custom Color Button */}
                <button
                  type="button"
                  onClick={() => colorInputRef.current?.click()}
                  style={{
                    backgroundColor: PALETTE.includes(color.toLowerCase()) ? '#1e293b' : color,
                    backgroundImage: PALETTE.includes(color.toLowerCase()) 
                      ? 'linear-gradient(135deg, #f43f5e 0%, #3b82f6 50%, #10b981 100%)' 
                      : 'none'
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border border-slate-700/50 ${
                    !PALETTE.includes(color.toLowerCase())
                      ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-110 shadow-lg'
                      : 'hover:scale-105'
                  }`}
                  title="Màu tùy chỉnh"
                >
                  <span className="text-[10px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                    +
                  </span>
                </button>
                <input
                  ref={colorInputRef}
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setIsColorCustomized(true);
                  }}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="price" className="text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                  Học phí/buổi *
                </label>
                <input
                  id="price"
                  type="number"
                  required
                  min="0"
                  step="10000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="250000"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="initialStatus" className="text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                  Trạng thái
                </label>
                <select
                  id="initialStatus"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Chưa dạy">Chưa dạy</option>
                  <option value="Đã dạy">Đã dạy</option>
                  <option value="Hủy">Đã hủy / nghỉ</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="border-t border-slate-100 dark:border-slate-850 pt-4">
                <label className="text-slate-900 dark:text-white font-bold text-sm block">
                  Lịch học định kỳ
                </label>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Chọn thứ và nhập giờ học tương ứng:
                </p>
              </div>

              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                {DAYS.map((day) => {
                  const config = dayConfigs[day];
                  return (
                    <div
                      key={day}
                      className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border transition-all ${
                        config.checked
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50'
                          : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-200/60 dark:border-slate-850'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-sm min-w-[100px]">
                        <input
                          type="checkbox"
                          checked={config.checked}
                          onChange={(e) => handleCheckboxChange(day, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className={config.checked ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}>
                          {day}
                        </span>
                      </label>

                      <div className="flex items-center gap-2 flex-grow justify-end md:justify-start">
                        <Clock className={`h-4 w-4 ${config.checked ? 'text-indigo-400' : 'text-slate-400'}`} />
                        <input
                          type="time"
                          value={config.time}
                          disabled={!config.checked}
                          onChange={(e) => handleTimeChange(day, e.target.value)}
                          className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold disabled:opacity-50 w-[110px]"
                        />

                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Số giờ:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          value={config.duration}
                          disabled={!config.checked}
                          onChange={(e) => handleDurationChange(day, parseFloat(e.target.value) || 1.5)}
                          className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold disabled:opacity-50 w-[70px] text-center"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-indigo-500/10 flex items-center gap-1.5 text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang Tạo Lịch...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Lưu Lịch Dạy
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

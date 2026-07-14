import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Clock, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  CalendarDays,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  DAYS,
  getDatesForWeekday,
  checkOverlaps,
  getStudentColor,
  formatCleanTimeString,
  getEndTime,
  formatDateVN,
  Session,
} from '@/lib/utils';

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  existingSessions: Session[];
  onSave: () => void;
}

interface SiblingCheck {
  id: string;
  checked: boolean;
  date: string;
  time: string;
  duration: number;
}

interface RecurringDayConfig {
  checked: boolean;
  time: string;
  duration: number;
}

export default function EditSessionModal({
  isOpen,
  onClose,
  session,
  existingSessions,
  onSave,
}: EditSessionModalProps) {
  const [studentName, setStudentName] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('Chưa dạy');
  const [grade, setGrade] = useState('');
  const [homework, setHomework] = useState('');
  const [note, setNote] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Thứ 2');
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState(1.5);
  
  const [siblings, setSiblings] = useState<SiblingCheck[]>([]);
  const [recurringConfigs, setRecurringConfigs] = useState<Record<string, RecurringDayConfig>>({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Accordion collapsed states (default collapsed for a cleaner, compact visual UI)
  const [siblingsCollapsed, setSiblingsCollapsed] = useState(true);
  const [recurringCollapsed, setRecurringCollapsed] = useState(true);

  // Hydrate fields
  useEffect(() => {
    if (!session) return;

    setStudentName(session.student_name || '');
    setPrice(String(session.price || ''));
    setStatus(session.status || 'Chưa dạy');
    setGrade(session.grade || '');
    setHomework(session.homework || '');
    setNote(session.note || '');
    setDayOfWeek(session.day_of_week || 'Thứ 2');
    setTime(formatCleanTimeString(session.time));
    setDuration(session.duration || 1.5);

    // Find siblings
    const related = existingSessions.filter(
      (s) =>
        s.student_name === session.student_name &&
        s.month_year === session.month_year &&
        s.teacher_name === session.teacher_name
    );

    setSiblings(
      related.map((s) => ({
        id: s.id,
        checked: true,
        date: s.date,
        time: s.time,
        duration: s.duration,
      }))
    );

    // Set recurring weekdays configs
    const recurringMap: Record<string, RecurringDayConfig> = DAYS.reduce((acc, day) => {
      const match = related.find((s) => s.day_of_week === day);
      acc[day] = {
        checked: !!match,
        time: match ? formatCleanTimeString(match.time) : '18:00',
        duration: match ? match.duration : 1.5,
      };
      return acc;
    }, {} as Record<string, RecurringDayConfig>);

    setRecurringConfigs(recurringMap);
    
    // Collapse by default when switching sessions
    setSiblingsCollapsed(true);
    setRecurringCollapsed(true);
  }, [session, existingSessions]);

  if (!isOpen || !session) return null;

  const handleSiblingCheck = (id: string, checked: boolean) => {
    setSiblings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checked } : s))
    );
  };

  const handleRecurringCheck = (day: string, checked: boolean) => {
    setRecurringConfigs((prev) => ({
      ...prev,
      [day]: { ...prev[day], checked },
    }));
  };

  const handleRecurringTimeChange = (day: string, timeVal: string) => {
    setRecurringConfigs((prev) => ({
      ...prev,
      [day]: { ...prev[day], time: timeVal },
    }));

    if (day === dayOfWeek) {
      setTime(formatCleanTimeString(timeVal));
    }
  };

  const handleRecurringDurationChange = (day: string, durVal: number) => {
    setRecurringConfigs((prev) => ({
      ...prev,
      [day]: { ...prev[day], duration: durVal },
    }));

    if (day === dayOfWeek) {
      setDuration(durVal);
    }
  };

  const handleActiveDayTimeDurationChange = (
    newDay: string,
    newTime: string,
    newDuration: number
  ) => {
    setDayOfWeek(newDay);
    setTime(formatCleanTimeString(newTime));
    setDuration(newDuration);

    setRecurringConfigs((prev) => {
      const updated = { ...prev };
      updated[newDay] = {
        checked: true,
        time: formatCleanTimeString(newTime),
        duration: newDuration,
      };
      return updated;
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentName.trim()) {
      setError('Vui lòng nhập tên học sinh.');
      return;
    }
    if (!price || Number(price) < 0) {
      setError('Vui lòng nhập giá học phí.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const selectedDays = Object.entries(recurringConfigs)
        .filter(([_, conf]) => conf.checked)
        .map(([day, conf]) => ({ day, time: formatCleanTimeString(conf.time), duration: conf.duration }));

      if (selectedDays.length === 0) {
        throw new Error('Vui lòng chọn ít nhất 1 thứ trong lịch định kỳ!');
      }

      const oldSiblings = existingSessions.filter(
        (s) =>
          s.student_name === session.student_name &&
          s.month_year === session.month_year &&
          s.teacher_name === session.teacher_name
      );

      const oldSiblingIds = oldSiblings.map((s) => s.id);
      const newSiblingSessions: Partial<Session>[] = [];
      const newColor = getStudentColor(studentName.trim());

      selectedDays.forEach(({ day, time: dayTime, duration: dayDur }) => {
        const dates = getDatesForWeekday(session.month_year, day);
        dates.forEach((dStr) => {
          const existing = oldSiblings.find((item) => item.date === dStr);
          if (existing) {
            const updated = {
              ...existing,
              student_name: studentName.trim(),
              price: Number(price),
              time: dayTime,
              duration: dayDur,
              day_of_week: day,
              color: newColor,
            };

            if (existing.id === session.id) {
              updated.status = status;
              updated.grade = grade.trim();
              updated.homework = homework.trim();
              updated.note = note.trim();
            }

            newSiblingSessions.push(updated);
          } else {
            newSiblingSessions.push({
              teacher_name: session.teacher_name,
              student_name: studentName.trim(),
              day_of_week: day,
              time: dayTime,
              duration: dayDur,
              price: Number(price),
              status: 'Chưa dạy',
              grade: '',
              homework: '',
              note: '',
              month_year: session.month_year,
              color: newColor,
              date: dStr,
            });
          }
        });
      });

      // Verification: Check overlaps
      const overlaps = checkOverlaps(newSiblingSessions, existingSessions, oldSiblingIds);
      if (overlaps.length > 0) {
        let msg = '';
        const strictOverlaps = overlaps.filter((o) => o.type === 'overlap');
        const gapWarnings = overlaps.filter((o) => o.type === 'gap');

        if (strictOverlaps.length > 0) {
          msg += 'Cảnh báo trùng lịch dạy (overlap) của giáo viên:\n';
          strictOverlaps.forEach((o) => {
            msg += `- Học sinh ${o.newS.student_name} (${o.newS.time}) trùng với ${o.extS.student_name} (${o.extS.time} - ${getEndTime(o.extS.time, o.extS.duration)}) vào ${formatDateVN(o.extS.date)}\n`;
          });
          msg += '\n';
        }

        if (gapWarnings.length > 0) {
          msg += 'Cảnh báo ca dạy liền nhau hoặc cách nhau dưới 15 phút:\n';
          gapWarnings.forEach((o) => {
            msg += `- Học sinh ${o.newS.student_name} (${o.newS.time}) cách dưới 15 phút với ${o.extS.student_name} (${o.extS.time} - ${getEndTime(o.extS.time, o.extS.duration)}) vào ${formatDateVN(o.extS.date)}\n`;
          });
          msg += '\n';
        }

        msg += 'Bạn có muốn tiếp tục lưu không?';
        if (!confirm(msg)) {
          setLoading(false);
          return;
        }
      }

      // Remove untracked siblings
      const keepIds = newSiblingSessions.map((s) => s.id).filter(Boolean) as string[];
      const deleteIds = oldSiblingIds.filter((id) => !keepIds.includes(id));

      if (deleteIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('sessions')
          .delete()
          .in('id', deleteIds);
        if (deleteError) throw new Error(deleteError.message);
      }

      // Upsert
      const { error: upsertError } = await supabase
        .from('sessions')
        .upsert(newSiblingSessions);
      if (upsertError) throw new Error(upsertError.message);

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật ca dạy.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSessions = async () => {
    const checkedIds = siblings.filter((s) => s.checked).map((s) => s.id);
    if (checkedIds.length === 0) {
      setError('Vui lòng tích chọn ít nhất 1 ca để xóa!');
      return;
    }

    const confirmed = confirm(
      `Bạn có chắc chắn muốn xóa ${checkedIds.length} ca dạy đã chọn? Các ca này sẽ biến mất vĩnh viễn.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .in('id', checkedIds);

      if (deleteError) throw new Error(deleteError.message);

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa ca dạy.');
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-[#070911]/90 z-[100] flex items-center justify-center p-4 overflow-hidden pointer-events-auto select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header - Static Sticky Top Actions Bar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Chi Tiết Ca Dạy
            </h2>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5 tracking-wider">
              {formatDateVN(session.date)}
            </span>
          </div>

          {/* Action Buttons Fixed At The Top */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleDeleteSessions}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/30 text-red-650 dark:text-red-400 font-bold text-xs rounded-xl flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              title="Xóa ca dạy"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Xóa</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSave()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all shadow-md cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Lưu</span>
            </button>

            <div className="border-l border-slate-200 dark:border-slate-800 h-6 mx-1"></div>

            <button 
              onClick={onClose}
              disabled={loading}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-grow overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Block 1: Basic Information */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="editStudentName" className="text-slate-550 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                Tên học sinh *
              </label>
              <input
                id="editStudentName"
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="editDay" className="text-slate-550 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Thứ trong tuần *
                </label>
                <select
                  id="editDay"
                  value={dayOfWeek}
                  onChange={(e) => handleActiveDayTimeDurationChange(e.target.value, time, duration)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d} className="dark:bg-slate-950">{d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="editTime" className="text-slate-550 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Giờ học *
                </label>
                <input
                  id="editTime"
                  type="time"
                  required
                  value={time}
                  onChange={(e) => handleActiveDayTimeDurationChange(dayOfWeek, e.target.value, duration)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="editDuration" className="text-slate-550 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Số giờ dạy *
                </label>
                <input
                  id="editDuration"
                  type="number"
                  step="0.5"
                  required
                  value={duration}
                  onChange={(e) => handleActiveDayTimeDurationChange(dayOfWeek, time, parseFloat(e.target.value) || 1.5)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="editPrice" className="text-slate-550 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Học phí/buổi *
                </label>
                <input
                  id="editPrice"
                  type="number"
                  step="10000"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="editStatus" className="text-slate-550 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Trạng thái *
                </label>
                <select
                  id="editStatus"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="Chưa dạy">Chưa dạy</option>
                  <option value="Đã dạy">Đã dạy</option>
                  <option value="Hủy">Đã Hủy / Nghỉ</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="editGrade" className="text-slate-550 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Điểm số
                </label>
                <input
                  id="editGrade"
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="VD: 9/10"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="editHomework" className="text-slate-550 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                Bài tập về nhà
              </label>
              <input
                id="editHomework"
                type="text"
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                placeholder="Nội dung bài tập..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="editNote" className="text-slate-550 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                Nhận xét & Ghi chú
              </label>
              <textarea
                id="editNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú buổi học..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm min-h-[80px] resize-y focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

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
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 space-y-2">
                <p className="text-slate-450 dark:text-slate-500 text-[10px] leading-tight mb-2">
                  Tích chọn để áp dụng thay đổi (Tên HS, học phí, số giờ, giờ học) hoặc xóa hàng loạt:
                </p>
                <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-1">
                  {siblings.map((sib) => {
                    const isCurrent = sib.id === session.id;
                    return (
                      <label
                        key={sib.id}
                        className={`flex items-center gap-2.5 cursor-pointer p-2 rounded-xl transition-all border ${
                          isCurrent
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/25 border-indigo-150 dark:border-indigo-900/40'
                            : 'bg-slate-50/40 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={sib.checked}
                          onChange={(e) => handleSiblingCheck(sib.id, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-350 dark:border-slate-700 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className={`text-xs font-semibold ${isCurrent ? 'text-indigo-950 dark:text-indigo-300 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                          {formatDateVN(sib.date)} ({formatCleanTimeString(sib.time)} - {getEndTime(sib.time, sib.duration)})
                          {isCurrent ? ' (Đang mở)' : ''}
                        </span>
                      </label>
                    );
                  })}
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
                            onChange={(e) => handleRecurringCheck(day, e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-350 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className={config.checked ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-550 dark:text-slate-450'}>
                            {day}
                          </span>
                        </label>

                        <div className="flex items-center gap-2 flex-grow justify-end md:justify-start">
                          <input
                            type="time"
                            value={config.time}
                            disabled={!config.checked}
                            onChange={(e) => handleRecurringTimeChange(day, e.target.value)}
                            className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold disabled:opacity-50 w-[100px] text-slate-800 dark:text-slate-200"
                          />

                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Số giờ:</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={config.duration}
                            disabled={!config.checked}
                            onChange={(e) => handleRecurringDurationChange(day, parseFloat(e.target.value) || 1.5)}
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
        </div>

      </div>
    </div>
  );
}

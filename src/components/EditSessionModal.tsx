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
  FileText,
  AlertTriangle,
  Users,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  DAYS, 
  getDatesForWeekday,
  timeToMinutes, 
  getEndTime, 
  formatCleanTimeString, 
  checkOverlaps, 
  getStudentColor,
  formatDateVN,
  formatVND,
  Session,
  formatNumberDots,
  parseNumberDots,
  sanitizeSessionPayload,
  cleanString
} from '@/lib/utils';
import SessionOverlapDeleteModals from './session-modal/SessionOverlapDeleteModals';
import SessionRecurringConfigsSection from './session-modal/SessionRecurringConfigsSection';
import SessionStudentRosterSection from './session-modal/SessionStudentRosterSection';

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  existingSessions: Session[];
  onSave: () => void;
  onSwitchSession?: (id: string) => void;
  teachers?: string[];
  currentUser?: {
    id?: string;
    role: 'admin' | 'teacher' | 'user';
    teacherName: string;
  };
  onDeleteSchedule?: (jobName: string, scope: 'month' | 'all') => Promise<void>;
  onDeleteSingleSession?: (sessionId: string) => Promise<void>;
  sessionStudentConfigs?: Record<string, any>;
  onSaveSessionStudentConfigs?: (teacherName: string, configs: Record<string, any>) => void;
  incomeCategories?: string[];
}

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

const generateUUID = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function EditSessionModal({
  isOpen,
  onClose,
  session,
  existingSessions,
  onSave,
  onSwitchSession,
  teachers = [],
  currentUser,
  onDeleteSchedule,
  onDeleteSingleSession,
  sessionStudentConfigs,
  onSaveSessionStudentConfigs,
  incomeCategories: propIncomeCategories
}: EditSessionModalProps) {
  const [assignedTeacherName, setAssignedTeacherName] = useState(session?.teacher_name || '');
  const [studentName, setStudentName] = useState('');
  const [studentCount, setStudentCount] = useState<number>(1);
  const [originalStudentCount, setOriginalStudentCount] = useState<number>(1);
  const [studentNames, setStudentNames] = useState<string[]>([]);
  const [presentStudents, setPresentStudents] = useState<string[]>([]);
  const [absentStudents, setAbsentStudents] = useState<string[]>([]);
  const [pricePerStudent, setPricePerStudent] = useState<string>('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('Chưa dạy');
  
  const rawInitCat = session?.income_category || session?.category || 'Gia Sư';
  const initCat = rawInitCat === 'Giáo dục' ? 'Gia Sư' : rawInitCat;
  const [incomeCategory, setIncomeCategory] = useState(initCat);

  // Load custom income categories from prop or default
  const incomeCategories = React.useMemo(() => {
    if (propIncomeCategories && propIncomeCategories.length > 0) {
      return propIncomeCategories;
    }
    return ['Gia Sư', 'Lương', 'Thu Nợ', 'Khác'];
  }, [propIncomeCategories]);
  const [color, setColor] = useState('#7c3aed');
  const [isColorCustomized, setIsColorCustomized] = useState(false);
  const colorInputRef = React.useRef<HTMLInputElement>(null);
  const [dayOfWeek, setDayOfWeek] = useState('Thứ 2');
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState(2);
  const [loaiHinh, setLoaiHinh] = useState<'tam_thoi' | 'co_dinh'>('co_dinh');
  const [autoCheckin, setAutoCheckin] = useState(false);
  
  const [siblings, setSiblings] = useState<SiblingCheck[]>([]);
  const [recurringConfigs, setRecurringConfigs] = useState<Record<string, RecurringDayConfig>>({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Accordion collapsed states (default collapsed for a cleaner, compact visual UI)
  const [siblingsCollapsed, setSiblingsCollapsed] = useState(true);
  const [recurringCollapsed, setRecurringCollapsed] = useState(true);

  // Overlap / delete confirm modal states — must be declared here (before any conditional return)
  const [warningMsg, setWarningMsg] = useState('');
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [pendingSiblingSessions, setPendingSiblingSessions] = useState<any[]>([]);
  const [pendingOldSiblingIds, setPendingOldSiblingIds] = useState<string[]>([]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteScope, setDeleteScope] = useState<'single' | 'month' | 'all'>('single');

  const loadedSessionIdRef = React.useRef<string | null>(null);

  // Hydrate fields
  useEffect(() => {
    if (!session) {
      loadedSessionIdRef.current = null;
      return;
    }
    if (loadedSessionIdRef.current === session.id) return;
    loadedSessionIdRef.current = session.id;

    setAssignedTeacherName(session.user_name || session.teacher_name || '');
    setStudentName(session.job_name || session.student_name || '');
    setPrice(String(session.price || ''));

    const sCount = session.student_count ?? 1;
    const origCount = session.original_student_count ?? sCount;
    const pPerStudent = session.price_per_student ?? (sCount > 0 ? Math.round((Number(session.price) || 0) / sCount) : Number(session.price) || 0);

    setStudentCount(sCount);
    setOriginalStudentCount(origCount);
    setPricePerStudent(String(pPerStudent || ''));

    // Hydrate student names and attendance status
    const jobKey = cleanString(session.job_name || session.student_name || '');
    const classCfg = sessionStudentConfigs ? sessionStudentConfigs[`class_${jobKey}`] : null;
    const sessCfg = (sessionStudentConfigs && session.id) ? sessionStudentConfigs[`sess_${session.id}`] : null;

    let names = session.student_names || sessCfg?.student_names || classCfg?.student_names || [];
    if (!Array.isArray(names) || names.length === 0) {
      if (origCount > 1) {
        names = Array.from({ length: origCount }, (_, i) => `Học sinh ${i + 1}`);
      } else {
        names = [];
      }
    } else if (names.length < origCount) {
      names = [
        ...names,
        ...Array.from({ length: origCount - names.length }, (_, i) => `Học sinh ${names.length + i + 1}`)
      ];
    }
    setStudentNames(names);

    let present = sessCfg?.present_students || session.present_students || [];
    let absent = sessCfg?.absent_students || session.absent_students || [];

    if (present.length === 0 && absent.length === 0) {
      if (sCount < origCount) {
        present = names.slice(0, sCount);
        absent = names.slice(sCount);
      } else {
        present = [...names];
        absent = [];
      }
    }
    setPresentStudents(present);
    setAbsentStudents(absent);

    let currentStatus = session.status || 'Chưa làm';
    if (currentStatus === 'Chưa dạy') currentStatus = 'Chưa làm';
    if (currentStatus === 'Đã dạy') currentStatus = 'Đã làm';
    setStatus(currentStatus);
    setDayOfWeek(session.day_of_week || 'Thứ 2');
    setTime(formatCleanTimeString(session.time));
    setDuration(session.duration || 2);
    setLoaiHinh((session.loai_hinh || session.loai_hinh_lich) === 'tam_thoi' ? 'tam_thoi' : 'co_dinh');
    const rawCat = session.income_category || session.category || 'Gia Sư';
    setIncomeCategory(rawCat === 'Giáo dục' ? 'Gia Sư' : rawCat);
    setAutoCheckin(session.auto_checkin ?? session.auto_check_in ?? true);
    
    const studentColor = session.color || getStudentColor(session.student_name);
    setColor(studentColor);
    setIsColorCustomized(!!session.color && session.color !== getStudentColor(session.student_name));

    // Find siblings using case-insensitive trimmed matching
    const curJob = (session.job_name || session.student_name || '').trim().toLowerCase();
    const curTeacher = (session.user_name || session.teacher_name || '').trim().toLowerCase();
    const related = existingSessions.filter((s) => {
      const sJob = (s.job_name || s.student_name || '').trim().toLowerCase();
      const sTeacher = (s.user_name || s.teacher_name || '').trim().toLowerCase();
      const matchJob = sJob === curJob;
      const matchMonth = s.month_year === session.month_year;
      const matchTeacher = !curTeacher || !sTeacher || sTeacher === curTeacher;
      return matchJob && matchMonth && matchTeacher;
    });

    // Set recurring weekdays configs first so we can use it to populate siblings
    const recurringMap: Record<string, RecurringDayConfig> = DAYS.reduce((acc, day) => {
      const match = related.find((s) => s.day_of_week === day);
      acc[day] = {
        checked: !!match,
        time: match ? formatCleanTimeString(match.time) : '18:00',
        duration: match ? match.duration : 2,
      };
      return acc;
    }, {} as Record<string, RecurringDayConfig>);

    setRecurringConfigs(recurringMap);

    // Build unique list of all dates from existing sessions + checked recurring weekdays
    const datesSet = new Set<string>();
    related.forEach((s) => datesSet.add(s.date));
    Object.entries(recurringMap).forEach(([day, conf]) => {
      if (conf.checked) {
        const dates = getDatesForWeekday(session.month_year, day);
        dates.forEach((d) => datesSet.add(d));
      }
    });

    const sortedDates = Array.from(datesSet).sort();

    const siblingList: SiblingCheck[] = sortedDates.map((dStr) => {
      const match = related.find((s) => s.date === dStr);
      const dateObj = new Date(dStr);
      const dayIndex = dateObj.getUTCDay();
      const dayMapIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      const dayOfWeekStr = DAYS[dayMapIndex];

      if (match) {
        return {
          id: match.id,
          date: dStr,
          day_of_week: dayOfWeekStr,
          checked: true,
          time: formatCleanTimeString(match.time),
          duration: match.duration,
        };
      } else {
        return {
          id: undefined,
          date: dStr,
          day_of_week: dayOfWeekStr,
          checked: false,
          time: recurringMap[dayOfWeekStr]?.time || '18:00',
          duration: recurringMap[dayOfWeekStr]?.duration || 2,
        };
      }
    });

    setSiblings(siblingList);
    
    // Collapse by default when switching sessions
    setSiblingsCollapsed(true);
    setRecurringCollapsed(true);
  }, [session, existingSessions]);

  // Get colors used by other students in existingSessions
  const usedColors = React.useMemo(() => {
    const currentTypedName = (studentName || '').trim().toLowerCase();
    const otherStudentsSessions = (existingSessions || []).filter(
      (s) => (s?.student_name || s?.job_name || '').trim().toLowerCase() !== currentTypedName
    );
    const colors = otherStudentsSessions.map((s) => (s?.color || '').toLowerCase()).filter(Boolean);
    return Array.from(new Set(colors));
  }, [existingSessions, studentName]);

  const availablePalette = PALETTE.filter((c) => !usedColors.includes(c.toLowerCase()));

  const handleColorChange = (newColor: string) => {
    if (usedColors.includes(newColor.toLowerCase())) {
      setError('Màu sắc này đã được sử dụng cho học sinh khác. Vui lòng chọn màu khác.');
      return;
    }
    setError('');
    setColor(newColor);
    setIsColorCustomized(true);
  };

  if (!isOpen || !session) return null;

  const handleSiblingCheck = (idOrDate: string, checked: boolean) => {
    setSiblings((prev) =>
      prev.map((s) => (s.id === idOrDate || s.date === idOrDate ? { ...s, checked } : s))
    );
  };

  const handleRecurringCheck = (day: string, checked: boolean) => {
    setRecurringConfigs((prev) => ({
      ...prev,
      [day]: { ...prev[day], checked },
    }));

    if (checked) {
      const dates = getDatesForWeekday(session.month_year, day);
      setSiblings((prev) => {
        const updated = [...prev];
        dates.forEach((dStr) => {
          const existingIdx = updated.findIndex((s) => s.date === dStr);
          if (existingIdx >= 0) {
            updated[existingIdx].checked = true;
          } else {
            updated.push({
              date: dStr,
              day_of_week: day,
              checked: true,
              time: recurringConfigs[day]?.time || '18:00',
              duration: recurringConfigs[day]?.duration || 2,
            });
          }
        });
        return updated.sort((a, b) => a.date.localeCompare(b.date));
      });
    } else {
      setSiblings((prev) => {
        return prev
          .map((s) => {
            if (s.day_of_week === day) {
              return { ...s, checked: false };
            }
            return s;
          })
          .filter((s) => s.id !== undefined || s.day_of_week !== day);
      });
    }
  };

  const handleRecurringTimeChange = (day: string, timeVal: string) => {
    setRecurringConfigs((prev) => ({
      ...prev,
      [day]: { ...prev[day], time: timeVal },
    }));

    if (day === dayOfWeek) {
      setTime(formatCleanTimeString(timeVal));
    }

    setSiblings((prev) =>
      prev.map((s) => (s.day_of_week === day ? { ...s, time: formatCleanTimeString(timeVal) } : s))
    );
  };

  const handleRecurringDurationChange = (day: string, durVal: number) => {
    setRecurringConfigs((prev) => ({
      ...prev,
      [day]: { ...prev[day], duration: durVal },
    }));

    if (day === dayOfWeek) {
      setDuration(durVal);
    }

    setSiblings((prev) =>
      prev.map((s) => (s.day_of_week === day ? { ...s, duration: durVal } : s))
    );
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

  const handlePriceChange = (valStr: string) => {
    const rawVal = parseNumberDots(valStr);
    const val = rawVal ? rawVal.toString() : '';
    setPrice(val);
    if (val && studentCount > 0) {
      setPricePerStudent(Math.round(Number(val) / studentCount).toString());
    } else if (!val) {
      setPricePerStudent('');
    }
  };

  const handlePricePerStudentChange = (valStr: string) => {
    const rawVal = parseNumberDots(valStr);
    const val = rawVal ? rawVal.toString() : '';
    setPricePerStudent(val);
    if (val) {
      setPrice((Number(val) * studentCount).toString());
    } else {
      setPrice('');
    }
  };

  const handleStudentCountChange = (newCount: number) => {
    const validCount = Math.max(0, Math.min(originalStudentCount, newCount));
    setStudentCount(validCount);
    if (pricePerStudent) {
      setPrice((Number(pricePerStudent) * validCount).toString());
    } else if (price) {
      setPricePerStudent(Math.round(Number(price) / (validCount || 1)).toString());
    }
  };

  const handleOriginalCountChange = (newCount: number) => {
    const validCount = Math.max(1, newCount);
    setOriginalStudentCount(validCount);
    setStudentNames((prev) => {
      const next = [...prev];
      if (next.length < validCount) {
        while (next.length < validCount) {
          next.push(`Học sinh ${next.length + 1}`);
        }
      } else if (next.length > validCount) {
        return next.slice(0, validCount);
      }
      return next;
    });
    if (studentCount >= originalStudentCount) {
      setStudentCount(validCount);
      setPresentStudents((prev) => {
        const next = [...prev];
        if (next.length < validCount) {
          while (next.length < validCount) {
            next.push(`Học sinh ${next.length + 1}`);
          }
        } else if (next.length > validCount) {
          return next.slice(0, validCount);
        }
        return next;
      });
      if (pricePerStudent) {
        setPrice((Number(pricePerStudent) * validCount).toString());
      }
    }
  };

  const handleStudentNameIndexChange = (index: number, val: string) => {
    const oldName = studentNames[index];
    setStudentNames((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
    if (oldName) {
      setPresentStudents((prev) => prev.map((n) => (n === oldName ? val : n)));
      setAbsentStudents((prev) => prev.map((n) => (n === oldName ? val : n)));
    }
  };

  const handleToggleStudentAttendance = (nameToToggle: string) => {
    const isCurrentlyPresent = presentStudents.includes(nameToToggle);
    let nextPresent: string[];
    let nextAbsent: string[];

    if (isCurrentlyPresent) {
      nextPresent = presentStudents.filter((n) => n !== nameToToggle);
      nextAbsent = Array.from(new Set([...absentStudents, nameToToggle]));
    } else {
      nextPresent = Array.from(new Set([...presentStudents, nameToToggle]));
      nextAbsent = absentStudents.filter((n) => n !== nameToToggle);
    }

    setPresentStudents(nextPresent);
    setAbsentStudents(nextAbsent);

    const newCount = nextPresent.length;
    setStudentCount(newCount);

    const pPerStudent = Number(pricePerStudent) || (originalStudentCount > 0 ? Math.round(Number(price) / originalStudentCount) : Number(price));
    setPrice((newCount * pPerStudent).toString());
  };

  const handleQuickReduceStudent = () => {
    if (studentCount <= 0) return;
    const newCount = Math.max(0, studentCount - 1);
    setStudentCount(newCount);
    if (presentStudents.length > 0) {
      const studentToMarkAbsent = presentStudents[presentStudents.length - 1];
      setPresentStudents(presentStudents.slice(0, -1));
      setAbsentStudents(prev => Array.from(new Set([...prev, studentToMarkAbsent])));
    }
    const pPerStudent = Number(pricePerStudent) || (originalStudentCount > 0 ? Math.round(Number(price) / originalStudentCount) : 0);
    setPrice((newCount * pPerStudent).toString());
  };

  const handleQuickResetStudent = () => {
    setStudentCount(originalStudentCount);
    setPresentStudents([...studentNames]);
    setAbsentStudents([]);
    const pPerStudent = Number(pricePerStudent) || (originalStudentCount > 0 ? Math.round(Number(price) / originalStudentCount) : 0);
    setPrice((originalStudentCount * pPerStudent).toString());
  };



  const executeUpsertSessions = async (newSessions: any[], oldIds: string[]) => {
    setLoading(true);
    setError('');
    setShowOverlapModal(false);

    try {
      const keepIds = newSessions.map((s) => s.id).filter(Boolean) as string[];
      const deleteIds = oldIds.filter((id) => !keepIds.includes(id));

      if (deleteIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('sessions')
          .delete()
          .in('id', deleteIds);
        if (deleteError) throw new Error(deleteError.message);
      }

      const sanitizedSessions = newSessions.map(sanitizeSessionPayload);

      if (sanitizedSessions.length > 0) {
        const { error: upsertError } = await supabase
          .from('sessions')
          .upsert(sanitizedSessions);

        if (upsertError) throw new Error(upsertError.message);
      }

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật ca dạy.');
    } finally {
      setLoading(false);
    }
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
    if (usedColors.includes(color.toLowerCase())) {
      setError('Màu sắc này đã được sử dụng cho học sinh khác. Vui lòng chọn màu khác.');
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

      const curJob = (session.job_name || session.student_name || '').trim().toLowerCase();
      const curTeacher = (session.user_name || session.teacher_name || '').trim().toLowerCase();
      const oldSiblings = existingSessions.filter((s) => {
        const sJob = (s.job_name || s.student_name || '').trim().toLowerCase();
        const sTeacher = (s.user_name || s.teacher_name || '').trim().toLowerCase();
        const matchJob = sJob === curJob;
        const matchMonth = s.month_year === session.month_year;
        const matchTeacher = !curTeacher || !sTeacher || sTeacher === curTeacher;
        return matchJob && matchMonth && matchTeacher;
      });
      const oldSiblingIds = oldSiblings.map((s) => s.id);
      const existingOtherSessions = existingSessions.filter((s) => !oldSiblingIds.includes(s.id));

      const newSiblingSessions: any[] = [];
      const sessionColor = color;

      siblings.forEach((sib) => {
        if (!sib.checked) return;

        const isCurrent = sib.id === session.id;
        const matchOld = oldSiblings.find((s) => s.id === sib.id || (sib.id === undefined && s.date === sib.date));

        const baseItem: any = {
          user_name: assignedTeacherName,
          job_name: studentName.trim(),
          teacher_name: assignedTeacherName,
          student_name: studentName.trim(),
          day_of_week: sib.day_of_week,
          time: formatCleanTimeString(sib.time),
          duration: Number(sib.duration),
          price: Number(price),
          color: sessionColor,
          loai_hinh: loaiHinh,
          loai_hinh_lich: loaiHinh,
          income_category: incomeCategory,
          category: incomeCategory,
          auto_checkin: autoCheckin,
          auto_check_in: autoCheckin,
          date: sib.date,
          month_year: session.month_year,
        };

        const currentPPerStudent = Number(pricePerStudent) || (studentCount > 0 ? Math.round(Number(price) / studentCount) : Number(price));
        const currentPrice = studentCount * currentPPerStudent;

        const cleanStudentNames = studentNames.length > 0 ? studentNames : Array.from({ length: originalStudentCount }, (_, i) => `Học sinh ${i + 1}`);

        if (isCurrent) {
          newSiblingSessions.push({
            ...session,
            ...(matchOld || {}),
            ...baseItem,
            price: currentPrice,
            student_count: studentCount,
            price_per_student: currentPPerStudent,
            original_student_count: originalStudentCount,
            student_names: cleanStudentNames,
            present_students: presentStudents,
            absent_students: absentStudents,
            status: status,
          });
        } else {
          const sibStudentCount = matchOld?.student_count ?? originalStudentCount;
          const sibPrice = sibStudentCount * currentPPerStudent;
          const sibPresent = matchOld?.present_students || (sibStudentCount < originalStudentCount ? cleanStudentNames.slice(0, sibStudentCount) : cleanStudentNames);
          const sibAbsent = matchOld?.absent_students || (sibStudentCount < originalStudentCount ? cleanStudentNames.slice(sibStudentCount) : []);
          const item: any = {
            ...(matchOld || {}),
            ...baseItem,
            price: sibPrice,
            student_count: sibStudentCount,
            price_per_student: currentPPerStudent,
            original_student_count: originalStudentCount,
            student_names: cleanStudentNames,
            present_students: sibPresent,
            absent_students: sibAbsent,
            status: matchOld ? matchOld.status : 'Chưa làm',
            id: sib.id || generateUUID(),
          };
          newSiblingSessions.push(item);
        }
      });

      // Save updated student configurations to Supabase
      if (onSaveSessionStudentConfigs && studentName.trim() && session?.id) {
        const classKey = `class_${cleanString(studentName.trim())}`;
        const sessKey = `sess_${session.id}`;
        const currentPPerStudent = Number(pricePerStudent) || (studentCount > 0 ? Math.round(Number(price) / studentCount) : Number(price));
        const cleanStudentNames = studentNames.length > 0 ? studentNames : Array.from({ length: originalStudentCount }, (_, i) => `Học sinh ${i + 1}`);
        const updatedConfigs = {
          ...(sessionStudentConfigs || {}),
          [classKey]: {
            student_count: originalStudentCount,
            price_per_student: currentPPerStudent,
            original_student_count: originalStudentCount,
            student_names: cleanStudentNames,
          },
          [sessKey]: {
            student_count: studentCount,
            price_per_student: currentPPerStudent,
            original_student_count: originalStudentCount,
            student_names: cleanStudentNames,
            present_students: presentStudents,
            absent_students: absentStudents,
          }
        };
        onSaveSessionStudentConfigs(assignedTeacherName, updatedConfigs);
      }

      const overlaps = checkOverlaps(newSiblingSessions, existingOtherSessions);
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

        setPendingSiblingSessions(newSiblingSessions);
        setPendingOldSiblingIds(oldSiblingIds);
        setWarningMsg(msg);
        setShowOverlapModal(true);
        setLoading(false);
        return;
      }

      await executeUpsertSessions(newSiblingSessions, oldSiblingIds);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật ca dạy.');
      setLoading(false);
    }
  };

  const executeDeleteSessions = async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    setShowDeleteConfirmModal(false);

    try {
      const jobName = session.job_name || session.student_name || '';

      if (deleteScope === 'single') {
        if (onDeleteSingleSession && session.id) {
          await onDeleteSingleSession(session.id);
        } else if (session.id) {
          const { error: delErr } = await supabase
            .from('sessions')
            .delete()
            .eq('id', session.id);
          if (delErr) throw new Error(delErr.message);
          onSave();
        }
      } else if (deleteScope === 'month') {
        if (onDeleteSchedule && jobName) {
          await onDeleteSchedule(jobName, 'month');
        } else {
          let checkedIds = siblings
            .filter((s) => s.id)
            .map((s) => s.id as string);
          if (checkedIds.length === 0 && session.id) checkedIds = [session.id];
          const { error: delErr } = await supabase
            .from('sessions')
            .delete()
            .in('id', checkedIds);
          if (delErr) throw new Error(delErr.message);
          onSave();
        }
      } else if (deleteScope === 'all') {
        if (onDeleteSchedule && jobName) {
          await onDeleteSchedule(jobName, 'all');
        } else {
          const { error: delErr } = await supabase
            .from('sessions')
            .delete()
            .ilike('job_name', jobName);
          if (delErr) throw new Error(delErr.message);
          onSave();
        }
      }

      onClose();
    } catch (err: any) {
      console.error('Error deleting sessions:', err);
      setError(err.message || 'Lỗi khi xóa ca dạy.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSessions = () => {
    setDeleteScope('single');
    setShowDeleteConfirmModal(true);
  };

  return (
    <div 
      className="fixed inset-0 bg-[#070911]/90 z-[100] flex items-center justify-center p-4 overflow-hidden pointer-events-auto select-none animate-mac-backdrop"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Overlap & Delete Confirmation Modals */}
      {session && (
        <SessionOverlapDeleteModals
          session={session}
          showOverlapModal={showOverlapModal}
          warningMsg={warningMsg}
          onCancelOverlap={() => setShowOverlapModal(false)}
          onConfirmOverlap={() => executeUpsertSessions(pendingSiblingSessions, pendingOldSiblingIds)}
          showDeleteConfirmModal={showDeleteConfirmModal}
          deleteScope={deleteScope}
          setDeleteScope={setDeleteScope}
          onCancelDelete={() => setShowDeleteConfirmModal(false)}
          onConfirmDelete={executeDeleteSessions}
          siblings={siblings}
          loading={loading}
        />
      )}
      <div 
        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] pointer-events-auto animate-mac-modal"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header - Static Sticky Top Actions Bar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Chi Tiết Lịch Trình / Chấm Công
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
              title="Xóa lịch trình"
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

          {/* Admin Mode Teacher Selector */}
          {currentUser?.role === 'admin' && teachers.length > 0 && (
            <div className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <label className="text-indigo-400 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider block">
                Giáo Viên Phụ Trách (Admin Mode)
              </label>
              <select
                value={assignedTeacherName}
                onChange={(e) => setAssignedTeacherName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-indigo-500/30 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {teachers.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          {/* Block 0: Status Function Buttons (chua day-da hoc-nghi) */}
          <div className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <label className="text-slate-550 dark:text-slate-400 text-xs font-bold uppercase tracking-wider block">
              Trạng thái công việc *
            </label>
            <div className="relative flex bg-slate-100 dark:bg-[#0d1018] border border-slate-200 dark:border-white/10 p-1 rounded-xl w-full">
              {/* Sliding pill background */}
              <div
                className={`absolute top-1 bottom-1 rounded-[10px] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none ${
                  status === 'Chưa làm' || status === 'Chưa dạy'
                    ? 'bg-indigo-650 dark:bg-indigo-500 shadow-[0_0_14px_rgba(99,102,241,0.4)]'
                    : status === 'Đã làm' || status === 'Đã dạy'
                    ? 'bg-emerald-650 dark:bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                    : 'bg-rose-650 dark:bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.4)]'
                }`}
                style={{
                  left: '4px',
                  width: 'calc(33.333% - 4px)',
                  transform:
                    status === 'Chưa làm' || status === 'Chưa dạy'
                      ? 'translateX(0)'
                      : status === 'Đã làm' || status === 'Đã dạy'
                      ? 'translateX(100%)'
                      : 'translateX(200%)',
                }}
              />
              <button
                type="button"
                onClick={() => setStatus('Chưa làm')}
                className={`relative z-10 flex-1 py-2 text-xs font-black rounded-[10px] transition-colors duration-300 cursor-pointer ${
                  status === 'Chưa làm' || status === 'Chưa dạy' ? 'text-white' : 'text-slate-550 dark:text-slate-455 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Chưa làm
              </button>
              <button
                type="button"
                onClick={() => setStatus('Đã làm')}
                className={`relative z-10 flex-1 py-2 text-xs font-black rounded-[10px] transition-colors duration-300 cursor-pointer ${
                  status === 'Đã làm' || status === 'Đã dạy' ? 'text-white' : 'text-slate-550 dark:text-slate-455 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Đã làm
              </button>
              <button
                type="button"
                onClick={() => setStatus('Hủy')}
                className={`relative z-10 flex-1 py-2 text-xs font-black rounded-[10px] transition-colors duration-300 cursor-pointer ${
                  status === 'Hủy' ? 'text-white' : 'text-slate-550 dark:text-slate-455 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Hủy / Nghỉ
              </button>
            </div>

            {/* Income Category Selector */}
            <div className="space-y-1 pt-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Danh Mục Thu Nhập (Dòng Tiền)
              </label>
              <select
                value={incomeCategory}
                onChange={(e) => setIncomeCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-[#0d1018] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {incomeCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Additional settings row: Loại hình & Tự động điểm danh */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Loại hình */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Loại hình
                </label>
                <div className="flex bg-slate-100 dark:bg-[#0d1018] p-1 rounded-xl border border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setLoaiHinh('tam_thoi')}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                      loaiHinh === 'tam_thoi'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-white'
                    }`}
                  >
                    Tạm thời
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoaiHinh('co_dinh')}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                      loaiHinh === 'co_dinh'
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-white'
                    }`}
                  >
                    Cố định
                  </button>
                </div>
              </div>

              {/* Tự động điểm danh */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tự động điểm danh
                </label>
                <button
                  type="button"
                  onClick={() => setAutoCheckin(prev => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border transition-all text-xs font-bold ${
                    autoCheckin
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-100 dark:bg-[#0d1018] border-slate-200 dark:border-white/10 text-slate-400'
                  }`}
                >
                  <span>{autoCheckin ? 'Bật tự động' : 'Tắt (Thủ công)'}</span>
                  <div className={`w-8 h-4.5 rounded-full transition-colors relative ${autoCheckin ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${autoCheckin ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Color Picker Row */}
          <div className="space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <label className="text-slate-550 dark:text-slate-400 text-xs font-bold uppercase tracking-wider block">
              Màu sắc hiển thị ca dạy
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {availablePalette.map((c) => {
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
                onChange={(e) => handleColorChange(e.target.value)}
                className="hidden"
              />
            </div>
          </div>

          {/* Block 2 & 3: Sibling Sessions List & Recurring Week Schedule */}
          <SessionRecurringConfigsSection
            currentSessionId={session.id}
            siblings={siblings}
            siblingsCollapsed={siblingsCollapsed}
            setSiblingsCollapsed={setSiblingsCollapsed}
            onSiblingCheck={handleSiblingCheck}
            onSwitchSession={onSwitchSession}
            recurringCollapsed={recurringCollapsed}
            setRecurringCollapsed={setRecurringCollapsed}
            recurringConfigs={recurringConfigs}
            onRecurringCheck={handleRecurringCheck}
            onRecurringTimeChange={handleRecurringTimeChange}
            onRecurringDurationChange={handleRecurringDurationChange}
          />

          {/* Block 1: Basic Information */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <label htmlFor="editStudentName" className="text-slate-550 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                Tên học sinh *
              </label>
              <input
                id="editStudentName"
                type="text"
                required
                value={studentName}
                onChange={(e) => {
                  const val = e.target.value;
                  setStudentName(val);
                  if (!isColorCustomized) {
                    const defColor = getStudentColor(val.trim());
                    const currentTypedName = (val || '').trim().toLowerCase();
                    const otherStudentsSessions = (existingSessions || []).filter(
                      (s) => (s?.student_name || s?.job_name || '').trim().toLowerCase() !== currentTypedName
                    );
                    const otherColors = new Set(otherStudentsSessions.map((s) => (s?.color || '').toLowerCase()).filter(Boolean));
                    if (otherColors.has((defColor || '').toLowerCase())) {
                      const available = PALETTE.find((c) => !otherColors.has((c || '').toLowerCase()));
                      setColor(available || '#7c3aed');
                    } else {
                      setColor(defColor);
                    }
                  }
                }}
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

            <div className="space-y-1.5">
              <label htmlFor="editDuration" className="text-slate-550 dark:text-slate-400 text-xs font-bold uppercase tracking-wider block">
                Số giờ dạy *
              </label>
              <input
                id="editDuration"
                type="number"
                step="0.5"
                required
                value={duration}
                onChange={(e) => handleActiveDayTimeDurationChange(dayOfWeek, time, parseFloat(e.target.value) || 2)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Multi-student & Fee Configuration Section */}
            <SessionStudentRosterSection
              originalStudentCount={originalStudentCount}
              studentCount={studentCount}
              studentNames={studentNames}
              presentStudents={presentStudents}
              absentStudents={absentStudents}
              pricePerStudent={pricePerStudent}
              price={price}
              sessionDate={session.date}
              onOriginalCountChange={handleOriginalCountChange}
              onPricePerStudentChange={handlePricePerStudentChange}
              onStudentNameIndexChange={handleStudentNameIndexChange}
              onQuickReduceStudent={handleQuickReduceStudent}
              onQuickResetStudent={handleQuickResetStudent}
              onToggleStudentAttendance={handleToggleStudentAttendance}
              onStudentCountChange={handleStudentCountChange}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

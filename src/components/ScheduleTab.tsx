import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Coins, 
  TrendingUp, 
  Plus, 
  RefreshCw, 
  AlertCircle,
  Clock,
  BarChart3,
  List,
  Eye,
  Layers,
  X,
  Edit3,
  CalendarDays,
  Sparkles,
  ArrowRight,
  Briefcase,
  Trash2,
  Loader2,
  Users,
  Copy
} from 'lucide-react';
import { 
  formatVND, 
  Session, 
  ScheduleWorkSummary, 
  StudentTuitionBreakdown,
  trunc1Dec, 
  getStudentColor, 
  formatDateVN, 
  getEndTime, 
  formatCleanTimeString 
} from '@/lib/utils';
import CalendarMonthView from '@/components/CalendarMonthView';
import CalendarWeekView from '@/components/CalendarWeekView';
import { DataTable } from '@/components/DataTable';
import { ColumnDef } from '@tanstack/react-table';

interface ScheduleTabProps {
  currentUser: {
    role: 'admin' | 'teacher' | 'user';
    teacherName: string;
  };
  totalSessions: number;
  completedSessions: number;
  earnedIncome: number;
  projectedIncome: number;
  teachers: string[];
  activeTeacherName: string;
  setActiveTeacherName: (name: string) => void;
  selectedMonth: string;
  setSelectedMonth: (val: string) => void;
  currentView: 'month' | 'week' | 'stats';
  setCurrentView: (view: 'month' | 'week' | 'stats') => void;
  loading: boolean;
  sessions: Session[];
  setAddModalOpen: (open: boolean) => void;
  setSelectedSession: (session: Session | null) => void;
  setEditModalOpen: (open: boolean) => void;
  onAddSessionOnDate?: (dateStr: string) => void;
  onDeleteSchedule?: (jobName: string, scope: 'month' | 'all') => Promise<void>;
  onDeleteSingleSession?: (sessionId: string) => Promise<void>;
}

export default function ScheduleTab({
  currentUser,
  totalSessions,
  completedSessions,
  earnedIncome,
  projectedIncome,
  teachers,
  activeTeacherName,
  setActiveTeacherName,
  selectedMonth,
  setSelectedMonth,
  currentView,
  setCurrentView,
  loading,
  sessions,
  setAddModalOpen,
  setSelectedSession,
  setEditModalOpen,
  onAddSessionOnDate,
  onDeleteSchedule,
  onDeleteSingleSession
}: ScheduleTabProps) {
  const [heroTeacherDropOpen, setHeroTeacherDropOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [selectedDetailSchedule, setSelectedDetailSchedule] = useState<ScheduleWorkSummary | null>(null);
  const [showDeleteScheduleModal, setShowDeleteScheduleModal] = useState(false);
  const [deleteScheduleScope, setDeleteScheduleScope] = useState<'month' | 'all'>('month');
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleConfirmDeleteSchedule = async () => {
    if (!selectedDetailSchedule || !onDeleteSchedule) return;
    setIsDeletingSchedule(true);
    try {
      await onDeleteSchedule(selectedDetailSchedule.name, deleteScheduleScope);
      setShowDeleteScheduleModal(false);
      setSelectedDetailSchedule(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingSchedule(false);
    }
  };

  // Group and compute statistics for each work schedule (lịch làm)
  const schedulesSummary = useMemo<ScheduleWorkSummary[]>(() => {
    if (!sessions || sessions.length === 0) return [];

    const groupsMap = new Map<string, Session[]>();
    sessions.forEach((s) => {
      const name = (s.job_name || s.student_name || 'Công việc').trim();
      if (!groupsMap.has(name)) {
        groupsMap.set(name, []);
      }
      groupsMap.get(name)!.push(s);
    });

    const weekdayOrder: Record<string, number> = {
      'Thứ 2': 1,
      'Thứ 3': 2,
      'Thứ 4': 3,
      'Thứ 5': 4,
      'Thứ 6': 5,
      'Thứ 7': 6,
      'Chủ Nhật': 7,
    };

    const results: ScheduleWorkSummary[] = [];

    groupsMap.forEach((sessList, name) => {
      // Sort sessions chronologically
      const sortedSessions = [...sessList].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || '').localeCompare(b.time || '');
      });

      const sample = sortedSessions[0];
      const color = sample.color || getStudentColor(name);
      const loai_hinh = (sample.loai_hinh || sample.loai_hinh_lich || 'co_dinh') as 'co_dinh' | 'tam_thoi';
      const income_category = sample.income_category || sample.category || 'Giáo dục';
      const price = Number(sample.price) || 0;
      const duration = Number(sample.duration) || 1.5;
      const time = sample.time || '18:00';
      const student_count = sample.student_count || 1;
      const price_per_student = sample.price_per_student || (student_count > 0 ? Math.round(price / student_count) : price);

      // Unique days of week
      const uniqueDays = Array.from(new Set(sortedSessions.map((s) => s.day_of_week).filter(Boolean)));
      uniqueDays.sort((a, b) => (weekdayOrder[a] || 99) - (weekdayOrder[b] || 99));

      const totalShifts = sortedSessions.length;
      let completedShifts = 0;
      let pendingShifts = 0;
      let cancelledShifts = 0;
      let earnedInc = 0;
      let projectedInc = 0;

      sortedSessions.forEach((s) => {
        const isCompleted = s.status === 'Đã làm' || s.status === 'Đã dạy';
        const isPending = s.status === 'Chưa làm' || s.status === 'Chưa dạy';
        const isCancelled = s.status === 'Hủy';
        const p = Number(s.price) || 0;

        if (isCompleted) {
          completedShifts++;
          earnedInc += p;
        } else if (isPending) {
          pendingShifts++;
        } else if (isCancelled) {
          cancelledShifts++;
        }

        if (!isCancelled) {
          projectedInc += p;
        }
      });

      const completionRate = totalShifts > 0 ? (completedShifts / totalShifts) * 100 : 0;

      // Compute student tuition breakdown for each student in the class
      let classStudentNames: string[] = sample.student_names || [];
      if (classStudentNames.length === 0 && (sample.original_student_count || student_count) > 1) {
        const count = sample.original_student_count || student_count;
        classStudentNames = Array.from({ length: count }, (_, i) => `Học sinh ${i + 1}`);
      }

      const studentBreakdowns: StudentTuitionBreakdown[] = [];
      if (classStudentNames.length > 0) {
        classStudentNames.forEach((sName) => {
          let sCompleted = 0;
          let sAbsent = 0;
          let sTotal = 0;
          const sAbsentDates: string[] = [];

          sortedSessions.forEach((s) => {
            if (s.status === 'Hủy') return;
            sTotal++;

            const isSessionCompleted = s.status === 'Đã làm' || s.status === 'Đã dạy';
            const isAbsent = (s.absent_students && s.absent_students.includes(sName)) || 
              (s.present_students && !s.present_students.includes(sName) && s.present_students.length > 0);

            if (isAbsent) {
              sAbsent++;
              sAbsentDates.push(s.date);
            } else if (isSessionCompleted) {
              sCompleted++;
            }
          });

          const pPerStudent = sample.price_per_student || (student_count > 0 ? Math.round(price / student_count) : price);
          const sFee = sCompleted * pPerStudent;

          studentBreakdowns.push({
            name: sName,
            totalSessions: sTotal,
            completedSessions: sCompleted,
            absentSessions: sAbsent,
            pricePerStudent: pPerStudent,
            totalFee: sFee,
            absentDates: sAbsentDates,
          });
        });
      }

      results.push({
        id: name,
        name,
        color,
        loai_hinh,
        income_category,
        price,
        duration,
        time,
        daysOfWeek: uniqueDays,
        totalShifts,
        completedShifts,
        pendingShifts,
        cancelledShifts,
        completionRate,
        earnedIncome: earnedInc,
        projectedIncome: projectedInc,
        student_count,
        price_per_student,
        student_names: classStudentNames,
        student_breakdowns: studentBreakdowns,
        sessions: sortedSessions,
      });
    });

    // Sort by totalShifts descending or by name
    return results.sort((a, b) => b.totalShifts - a.totalShifts || a.name.localeCompare(b.name));
  }, [sessions]);

  // Define columns for TanStack DataTable
  const columns = useMemo<ColumnDef<ScheduleWorkSummary>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Lịch Làm / Công Việc',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-3">
            <span
              className="h-3.5 w-3.5 rounded-full shrink-0 shadow-[0_0_10px_currentColor]"
              style={{ backgroundColor: item.color, color: item.color }}
            />
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-white text-xs truncate">{item.name}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                  item.loai_hinh === 'tam_thoi'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                }`}>
                  {item.loai_hinh === 'tam_thoi' ? 'Tạm thời' : 'Cố định'}
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  | {item.income_category}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'daysOfWeek',
      header: 'Lịch / Khung Giờ',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-1">
              {item.daysOfWeek.map((day) => (
                <span
                  key={day}
                  className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-extrabold text-slate-300"
                >
                  {day}
                </span>
              ))}
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {formatCleanTimeString(item.time)} ({item.duration}h/ca)
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'price',
      header: () => <div className="text-right">Học Phí / Ca</div>,
      cell: ({ row, getValue }) => {
        const item = row.original;
        const count = item.student_count ?? 1;
        return (
          <div className="text-right">
            <div className="font-extrabold text-xs text-slate-200">
              {formatVND(getValue<number>())}
            </div>
            {count > 1 && (
              <div className="text-[9.5px] text-indigo-400 font-bold">
                {count} HS ({formatVND(item.price_per_student || 0)}/HS)
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'totalShifts',
      header: () => <div className="text-center">Tổng Ca</div>,
      cell: ({ getValue }) => (
        <div className="text-center">
          <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-black text-xs">
            {getValue<number>()} ca
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'completedShifts',
      header: () => <div className="text-center">Đã Làm</div>,
      cell: ({ getValue }) => (
        <div className="text-center">
          <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-black text-xs">
            {getValue<number>()} ca
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'pendingShifts',
      header: () => <div className="text-center">Chưa Làm</div>,
      cell: ({ getValue }) => (
        <div className="text-center">
          <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black text-xs">
            {getValue<number>()} ca
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'cancelledShifts',
      header: () => <div className="text-center">Đã Hủy</div>,
      cell: ({ getValue }) => {
        const val = getValue<number>();
        return (
          <div className="text-center">
            <span className={`inline-block px-2 py-1 rounded-lg text-xs font-black ${
              val > 0
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                : 'text-slate-500'
            }`}>
              {val}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'completionRate',
      header: 'Tiến Độ',
      cell: ({ row }) => {
        const item = row.original;
        const rate = item.completionRate;
        return (
          <div className="flex flex-col gap-1 min-w-[120px]">
            <div className="flex justify-between items-center text-[10px] font-black">
              <span className="text-emerald-400">{trunc1Dec(rate)}%</span>
              <span className="text-slate-400">{item.completedShifts}/{item.totalShifts}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#1e2638] overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'earnedIncome',
      header: () => <div className="text-right">Thực Nhận</div>,
      cell: ({ getValue }) => (
        <div className="text-right font-black text-xs text-cyan-400">
          {formatVND(getValue<number>())}
        </div>
      ),
    },
    {
      accessorKey: 'projectedIncome',
      header: () => <div className="text-right">Dự Kiến Tổng</div>,
      cell: ({ getValue }) => (
        <div className="text-right font-black text-xs text-purple-400">
          {formatVND(getValue<number>())}
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Thao Tác</div>,
      enableSorting: false,
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDetailSchedule(item);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-extrabold transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Xem Ca</span>
            </button>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-6 animate-mac-dropdown">
      
      {/* Scheduler Header */}
      <section className="relative flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
        <div className="space-y-1 max-w-2xl relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
            Lịch Trình
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-wide pt-0.5">
            {totalSessions > 0 
              ? `Tháng này bạn có ${totalSessions} lịch làm việc (đã hoàn thành ${completedSessions} buổi | ${schedulesSummary.length} lịch làm khác nhau).`
              : 'Hiện tại chưa có lịch trình nào được tạo cho tháng này.'
            }
          </p>
        </div>

        {/* Action button & Month Selector */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 z-10" data-picker>
          {/* Hero — Teacher Dropdown (Admin only) */}
          {currentUser.role === 'admin' && teachers.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setHeroTeacherDropOpen(o => !o)}
                className="flex items-center gap-2 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-white text-xs font-bold rounded-xl px-3.5 py-2.5 cursor-pointer focus:outline-none transition-all shadow-lg"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
                <span>{activeTeacherName}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${heroTeacherDropOpen ? 'rotate-180' : ''}`}/>
              </button>
              {heroTeacherDropOpen && (
                <div className="absolute top-full mt-2 left-0 z-[200] min-w-full w-max bg-[#0d1018] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-mac-dropdown origin-top-left">
                  {teachers.map(t => (
                    <button 
                      key={t} 
                      onClick={() => { setActiveTeacherName(t); setHeroTeacherDropOpen(false); }} 
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-left transition-colors cursor-pointer ${
                        t === activeTeacherName ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      {t === activeTeacherName && <Check className="h-3 w-3 text-indigo-400 shrink-0"/>}
                      <span className={t === activeTeacherName ? '' : 'ml-5'}>{t}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 3 Dominating KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-5 text-left">
        {/* KPI 1 */}
        <div className="kpi-card-purple p-6 flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] font-black text-purple-400 text-glow-purple uppercase tracking-widest block truncate">
                Lịch Trình Trong Tháng
              </span>
              <span className="text-xl sm:text-2xl font-black text-purple-400 text-glow-purple tracking-tight block truncate">
                {totalSessions}
              </span>
              <div className="flex items-center gap-1 select-none">
                <span className="text-[9px] font-black text-purple-300/80">
                  {schedulesSummary.length} lịch làm | Tổng số buổi
                </span>
              </div>
            </div>
            <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-xl shadow-[0_0_12px_rgba(168,85,247,0.35)] shrink-0">
              <CalendarIcon className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="kpi-card-green p-6 flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] font-black text-emerald-400 text-glow-green uppercase tracking-widest block truncate">
                Đã Hoàn Thành
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 text-glow-green tracking-tight block truncate">
                {completedSessions}
              </span>
              <div className="flex items-center gap-1 select-none">
                {totalSessions > 0 && (
                  <span className="text-[9px] font-black text-emerald-400">
                    ↑ {trunc1Dec((completedSessions / totalSessions) * 100)}% hoàn tất
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl shadow-[0_0_12px_rgba(16,185,129,0.35)] shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="kpi-card-blue p-6 flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] font-black text-cyan-400 text-glow-blue uppercase tracking-widest block truncate">
                Giá Trị Thực Tế
              </span>
              <span className="text-xl sm:text-2xl font-black text-cyan-400 text-glow-blue tracking-tight block truncate">
                {formatVND(earnedIncome)}
              </span>
              <div className="flex items-center gap-1 select-none">
                <span className="text-[9px] font-black text-cyan-300/80">
                  Dự kiến: {formatVND(projectedIncome)}
                </span>
              </div>
            </div>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-xl shadow-[0_0_12px_rgba(6,182,212,0.35)] shrink-0">
              <Coins className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content View with 3-Way Sliding Pill Indicator */}
      <section className="flex-grow flex flex-col min-h-[480px]">
        {/* Toolbar & View Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-[#5c36f5] shadow-[0_0_10px_rgba(92,54,245,1)]"></div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              {currentView === 'stats' ? 'Thống Kê Số Ca Theo Lịch Làm' : 'Bảng Lịch Trình'}
            </h3>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Add Session Button */}
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-1.5 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-[11px] rounded-xl shadow-[0_4px_12px_rgba(92,54,245,0.35)] hover:scale-[1.02] transition-all cursor-pointer border border-white/20 select-none"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm Lịch Trình / Chấm Công</span>
            </button>

            {/* Month Selector dropdown */}
            <div className="relative" data-picker>
              <button
                onClick={() => { setMonthPickerOpen(o => !o); setPickerYear(parseInt(selectedMonth.split('-')[0])); }}
                className="flex items-center gap-2 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-white text-[11px] font-bold rounded-xl px-3.5 py-1.5 cursor-pointer transition-all shadow-lg"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="font-black">
                  {(() => { const [y, m] = selectedMonth.split('-'); return ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'][parseInt(m)-1]+' '+y; })()}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${monthPickerOpen ? 'rotate-180' : ''}`}/>
              </button>
              {monthPickerOpen && (
                <div className="absolute top-full mt-2 right-0 z-[200] w-64 bg-[#0d1018] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-4 animate-mac-dropdown origin-top-right">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setPickerYear(y => y-1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronLeft className="h-4 w-4"/></button>
                    <span className="text-sm font-black text-white">{pickerYear}</span>
                    <button onClick={() => setPickerYear(y => y+1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronRight className="h-4 w-4"/></button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Th.1','Th.2','Th.3','Th.4','Th.5','Th.6','Th.7','Th.8','Th.9','Th.10','Th.11','Th.12'].map((mn, i) => {
                      const val = `${pickerYear}-${String(i+1).padStart(2,'0')}`;
                      const isActive = val === selectedMonth;
                      return (
                        <button 
                          key={mn} 
                          onClick={() => { setSelectedMonth(val); setMonthPickerOpen(false); }} 
                          className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            isActive ? 'bg-[#5c36f5] text-white shadow-[0_0_12px_rgba(92,54,245,0.5)]' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
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

            {/* 3-Way Sliding Pill Indicator Segmented Control (Rule #7) */}
            <div className="relative flex bg-[#0d1018] border border-white/10 p-1 rounded-xl text-xs shrink-0 font-bold select-none min-w-[280px]">
              <div
                className="absolute top-1 bottom-1 rounded-lg bg-[#5c36f5] shadow-[0_0_14px_rgba(92,54,245,0.5)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none"
                style={{
                  left: currentView === 'month' ? '4px' : currentView === 'week' ? 'calc( (100% / 3) * 1 + 1px )' : 'calc( (100% / 3) * 2 + 1px )',
                  width: 'calc( (100% / 3) - 4px )',
                }}
              />
              <button
                onClick={() => setCurrentView('month')}
                className={`flex-1 relative z-10 py-1.5 px-3 text-center transition-colors cursor-pointer text-[10px] font-black ${
                  currentView === 'month' ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                LỊCH THÁNG
              </button>
              <button
                onClick={() => setCurrentView('week')}
                className={`flex-1 relative z-10 py-1.5 px-3 text-center transition-colors cursor-pointer text-[10px] font-black ${
                  currentView === 'week' ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                LỊCH TUẦN
              </button>
              <button
                onClick={() => setCurrentView('stats')}
                className={`flex-1 relative z-10 py-1.5 px-3 text-center transition-colors cursor-pointer text-[10px] font-black ${
                  currentView === 'stats' ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                THỐNG KÊ CA
              </button>
            </div>
          </div>
        </div>

        {/* Quick Shift Progress Pills Bar (Available on Month & Week views) */}
        {currentView !== 'stats' && schedulesSummary.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-3 custom-scrollbar mb-2 select-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141824] border border-white/5 text-[11px] font-extrabold text-slate-400 shrink-0">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
              <span>Tiến độ ca:</span>
            </div>
            {schedulesSummary.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedDetailSchedule(item)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121626] hover:bg-[#1a2035] border border-white/10 hover:border-indigo-500/40 transition-all text-xs shrink-0 cursor-pointer shadow-sm group"
                title="Bấm để xem chi tiết ca làm việc"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
                  style={{ backgroundColor: item.color, color: item.color }}
                />
                <span className="font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                  {item.name}
                </span>
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  {item.completedShifts}/{item.totalShifts} ca
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  ({trunc1Dec(item.completionRate)}%)
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        {loading ? (
          <div className="calendar-container-depth flex flex-col items-center justify-center p-16 text-slate-400 gap-3 min-h-[380px] h-full bg-[#141824] rounded-3xl">
            <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
            <span className="font-extrabold text-sm text-slate-300">Đang tải dữ liệu từ database...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="calendar-container-depth flex flex-col items-center justify-center py-20 px-6 text-center min-h-[380px] h-full bg-[#141824] rounded-3xl">
            <div className="h-16 w-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 shadow-sm">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black text-white">
              Chưa có lịch làm việc nào trong tháng {selectedMonth}
            </h3>
            <p className="text-xs text-slate-400 mt-2 max-w-md font-medium">
              Hãy click nút "Thêm Lịch Trình / Chấm Công" phía trên để khởi tạo lịch làm.
            </p>
          </div>
        ) : currentView === 'stats' ? (
          /* WORK SCHEDULE STATISTICS VIEW (THỐNG KÊ SỐ CA CỦA MỖI LỊCH LÀM) */
          <div className="space-y-6">
            
            {/* Visual Schedule Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedulesSummary.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#141824] rounded-2xl p-5 border border-white/10 hover:border-indigo-500/40 transition-all flex flex-col justify-between gap-4 shadow-lg group relative overflow-hidden text-left"
                >
                  {/* Subtle top indicator bar matching schedule color */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: item.color }}
                  />

                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className="h-3.5 w-3.5 rounded-full shrink-0 shadow-[0_0_10px_currentColor]"
                        style={{ backgroundColor: item.color, color: item.color }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-white truncate leading-tight group-hover:text-indigo-300 transition-colors">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                            item.loai_hinh === 'tam_thoi'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                          }`}>
                            {item.loai_hinh === 'tam_thoi' ? 'Tạm thời' : 'Cố định'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 truncate">
                            | {item.income_category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-200 block">
                        {formatVND(item.price)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 block">
                        {(item.student_count ?? 1) > 1 ? `${item.student_count} HS • ` : ''}/ ca ({item.duration}h)
                      </span>
                    </div>
                  </div>

                  {/* Timing & Weekday Rhythm */}
                  <div className="flex flex-wrap items-center gap-1.5 py-2 px-3 rounded-xl bg-[#0e121e] border border-white/5">
                    <Clock className="h-3.5 w-3.5 text-indigo-400 shrink-0 mr-1" />
                    <span className="text-[10px] font-black text-slate-300 mr-2">
                      {formatCleanTimeString(item.time)}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.daysOfWeek.map((d) => (
                        <span
                          key={d}
                          className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-extrabold text-slate-300"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 4 Shift Breakdown Metric Badges */}
                  <div className="grid grid-cols-4 gap-2 text-center select-none">
                    <div className="p-2 rounded-xl bg-[#101422] border border-white/5 flex flex-col items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tổng</span>
                      <span className="text-sm font-black text-white mt-0.5">{item.totalShifts}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center">
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">Đã Làm</span>
                      <span className="text-sm font-black text-emerald-300 mt-0.5">{item.completedShifts}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center">
                      <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Chưa</span>
                      <span className="text-sm font-black text-amber-300 mt-0.5">{item.pendingShifts}</span>
                    </div>
                    <div className={`p-2 rounded-xl border flex flex-col items-center ${
                      item.cancelledShifts > 0
                        ? 'bg-rose-500/10 border-rose-500/20'
                        : 'bg-[#101422] border-white/5'
                    }`}>
                      <span className={`text-[9px] font-black uppercase tracking-wider ${
                        item.cancelledShifts > 0 ? 'text-rose-400' : 'text-slate-500'
                      }`}>Hủy</span>
                      <span className={`text-sm font-black mt-0.5 ${
                        item.cancelledShifts > 0 ? 'text-rose-300' : 'text-slate-500'
                      }`}>{item.cancelledShifts}</span>
                    </div>
                  </div>

                  {/* Completion Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-black select-none">
                      <span className="text-slate-400">Tiến độ hoàn thành</span>
                      <span className="text-emerald-400 font-extrabold">{trunc1Dec(item.completionRate)}% ({item.completedShifts}/{item.totalShifts} ca)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#0e121e] overflow-hidden border border-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        style={{ width: `${Math.min(100, Math.max(0, item.completionRate))}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial Summary & Action Button */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    <div className="text-left">
                      <span className="text-[9px] font-bold text-slate-400 block">Thực nhận / Dự kiến:</span>
                      <span className="text-xs font-black text-cyan-400">
                        {formatVND(item.earnedIncome)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 ml-1">
                        / {formatVND(item.projectedIncome)}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedDetailSchedule(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-extrabold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Chi tiết ({item.totalShifts})</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Comprehensive TanStack DataTable Mode (Rule #17) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 select-none">
                <div className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                  Bảng Chi Tiết Thống Kê Số Ca & Doanh Thu
                </h4>
              </div>

              <DataTable<ScheduleWorkSummary>
                data={schedulesSummary}
                columns={columns}
                pageSize={20}
                showPagination={true}
                enableGlobalSearch={true}
                enableColumnVisibility={true}
                enableMultiSort={true}
                enableExport={true}
                searchPlaceholder="Tìm lịch làm việc..."
                exportFilename={`thong_ke_ca_${selectedMonth}`}
                emptyMessage="Không có dữ liệu lịch làm nào trong tháng."
                enableRowExpansion={true}
                renderSubComponent={({ row }) => {
                  const item = row.original;
                  return (
                    <div className="p-4 bg-[#0d1018] rounded-xl border border-white/10 space-y-3 text-left">
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-extrabold text-white text-xs">
                            Danh sách các ca của "{item.name}" trong tháng {selectedMonth}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {item.completedShifts}/{item.totalShifts} ca hoàn thành ({trunc1Dec(item.completionRate)}%)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {item.sessions.map((s) => {
                          const isDone = s.status === 'Đã làm' || s.status === 'Đã dạy';
                          const isCancel = s.status === 'Hủy';
                          const isReduced = (s.student_count ?? 1) < (s.original_student_count ?? (s.student_count ?? 1));
                          return (
                            <div
                              key={s.id}
                              onClick={() => {
                                setSelectedSession(s);
                                setEditModalOpen(true);
                              }}
                              className="p-2.5 rounded-xl bg-[#141824] hover:bg-[#1c2234] border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[11px] font-black text-white truncate">
                                    {formatDateVN(s.date)}
                                  </span>
                                  {(s.student_count ?? 1) > 1 && !isReduced && (
                                    <span className="text-[8.5px] font-black px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                                      {s.student_count} HS
                                    </span>
                                  )}
                                  {isReduced && (
                                    <span className="text-[8.5px] font-black px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-300 border border-amber-500/40 animate-pulse shrink-0" title={`Giảm ${(s.original_student_count || 0) - (s.student_count || 0)} học sinh vắng mặt`}>
                                      {s.student_count}/{s.original_student_count} HS (vắng)
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    : isCancel
                                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                }`}>
                                  {s.status}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                <span>{formatCleanTimeString(s.time)} - {getEndTime(formatCleanTimeString(s.time), s.duration)}</span>
                                <span className={`font-black ${isReduced ? 'text-amber-400' : 'text-slate-200'}`}>{formatVND(s.price)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
            </div>

          </div>
        ) : (
          /* CALENDAR MONTH & WEEK VIEWS */
          <div className="grid grid-cols-1 grid-rows-1 w-full flex-grow overflow-hidden">
            <div 
              className={`col-start-1 row-start-1 transition-all duration-300 ease-out ${
                currentView === 'month' 
                  ? 'opacity-100 scale-100 z-10 pointer-events-auto' 
                  : 'opacity-0 scale-[0.98] z-0 pointer-events-none'
              }`}
            >
              <CalendarMonthView
                selectedMonth={selectedMonth}
                sessions={sessions}
                onSessionClick={(id) => {
                  const sess = sessions.find((s) => s.id === id);
                  if (sess) {
                    setSelectedSession(sess);
                    setEditModalOpen(true);
                  }
                }}
                onAddSessionOnDate={onAddSessionOnDate}
              />
            </div>

            <div 
              className={`col-start-1 row-start-1 transition-all duration-300 ease-out ${
                currentView === 'week' 
                  ? 'opacity-100 scale-100 z-10 pointer-events-auto' 
                  : 'opacity-0 scale-[0.98] z-0 pointer-events-none'
              }`}
            >
              <CalendarWeekView
                sessions={sessions}
                onSessionClick={(id) => {
                  const sess = sessions.find((s) => s.id === id);
                  if (sess) {
                    setSelectedSession(sess);
                    setEditModalOpen(true);
                  }
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* DETAIL MODAL: Work Schedule Session Breakdown */}
      {selectedDetailSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 transition-opacity cursor-pointer"
            onClick={() => setSelectedDetailSchedule(null)}
          />
          <div className="relative w-full max-w-2xl bg-[#0d1018] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] flex flex-col text-left animate-mac-dropdown">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="h-4 w-4 rounded-full shrink-0 shadow-[0_0_10px_currentColor]"
                  style={{ backgroundColor: selectedDetailSchedule.color, color: selectedDetailSchedule.color }}
                />
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-white truncate">
                    {selectedDetailSchedule.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                      selectedDetailSchedule.loai_hinh === 'tam_thoi'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                    }`}>
                      {selectedDetailSchedule.loai_hinh === 'tam_thoi' ? 'Tạm thời' : 'Cố định'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      | {selectedDetailSchedule.income_category}
                    </span>
                    <span className="text-xs font-black text-slate-300">
                      | {formatVND(selectedDetailSchedule.price)} / ca
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailSchedule(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Metrics Bar inside Modal */}
            <div className="grid grid-cols-4 gap-2.5 my-4 shrink-0 select-none">
              <div className="p-3 rounded-xl bg-[#141824] border border-white/5 text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Tổng số ca</span>
                <span className="text-base font-black text-white mt-0.5 block">{selectedDetailSchedule.totalShifts} ca</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">Đã làm</span>
                <span className="text-base font-black text-emerald-300 mt-0.5 block">{selectedDetailSchedule.completedShifts} ca</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider block">Chưa làm</span>
                <span className="text-base font-black text-amber-300 mt-0.5 block">{selectedDetailSchedule.pendingShifts} ca</span>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider block">Thực nhận</span>
                <span className="text-xs font-black text-cyan-300 mt-1 block">{formatVND(selectedDetailSchedule.earnedIncome)}</span>
              </div>
            </div>

            {/* Multi-Student Tuition Breakdown Card */}
            {selectedDetailSchedule.student_breakdowns && selectedDetailSchedule.student_breakdowns.length > 1 && (
              <div className="p-4 rounded-2xl bg-[#141824] border border-indigo-500/30 space-y-3 shrink-0 shadow-lg my-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Bảng Tính Học Phí Từng Học Sinh ({selectedDetailSchedule.student_breakdowns.length} HS)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const lines = [
                        `📋 BẢNG TỔNG KẾT HỌC PHÍ THÁNG ${selectedMonth}`,
                        `Lớp: ${selectedDetailSchedule.name}`,
                        `Đơn giá: ${formatVND(selectedDetailSchedule.price_per_student || 0)} / buổi / học sinh`,
                        `---------------------------------`,
                        ...selectedDetailSchedule.student_breakdowns!.map((st, i) => {
                          const absentText = st.absentSessions > 0 ? ` (Nghỉ ${st.absentSessions} buổi: ${st.absentDates.map(d => formatDateVN(d)).join(', ')})` : '';
                          return `${i + 1}. ${st.name}: ${st.completedSessions} buổi${absentText} ➔ ${formatVND(st.totalFee)}`;
                        }),
                        `---------------------------------`,
                        `Tổng học phí cả lớp: ${formatVND(selectedDetailSchedule.student_breakdowns!.reduce((sum, st) => sum + st.totalFee, 0))}`
                      ].join('\n');
                      handleCopyText(lines, 'copy_all_tuition');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 hover:text-white rounded-xl text-[11px] font-black cursor-pointer transition-all active:scale-95"
                  >
                    {copiedId === 'copy_all_tuition' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Sao Chép Báo Cáo Cả Lớp</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedDetailSchedule.student_breakdowns.map((st, i) => {
                    const studentId = `st_copy_${i}`;
                    const isCopied = copiedId === studentId;
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-[#0d1018] border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-xs font-black text-white truncate block">
                              {st.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold">
                              <span className="text-emerald-400">
                                {st.completedSessions} / {st.totalSessions} buổi đã học
                              </span>
                              {st.absentSessions > 0 && (
                                <span className="text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                                  Nghỉ {st.absentSessions}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="text-xs font-black text-cyan-400 shrink-0">
                            {formatVND(st.totalFee)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[10px] text-slate-400">
                          <span>{formatVND(st.pricePerStudent)}/buổi</span>
                          <button
                            type="button"
                            onClick={() => {
                              const msg = [
                                `📋 THÔNG BÁO HỌC PHÍ THÁNG ${selectedMonth}`,
                                `- Lớp: ${selectedDetailSchedule.name}`,
                                `- Học sinh: ${st.name}`,
                                `- Số buổi đã học: ${st.completedSessions}/${st.totalSessions} buổi${st.absentSessions > 0 ? ` (Nghỉ ${st.absentSessions} buổi: ${st.absentDates.map(d => formatDateVN(d)).join(', ')})` : ''}`,
                                `- Đơn giá: ${formatVND(st.pricePerStudent)} / buổi`,
                                `- Tổng học phí: ${formatVND(st.totalFee)}`
                              ].join('\n');
                              handleCopyText(msg, studentId);
                            }}
                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer transition-colors"
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span className="text-emerald-400 font-black">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 my-2">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block mb-2">
                Danh sách chi tiết các buổi ({selectedDetailSchedule.sessions.length} ca trong tháng {selectedMonth}):
              </span>

              {selectedDetailSchedule.sessions.map((s, idx) => {
                const isDone = s.status === 'Đã làm' || s.status === 'Đã dạy';
                const isCancel = s.status === 'Hủy';
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSession(s);
                      setEditModalOpen(true);
                    }}
                    className="p-3 rounded-xl bg-[#141824] hover:bg-[#1a2032] border border-white/5 hover:border-indigo-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-black text-slate-500 w-5 text-center">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold text-white block group-hover:text-indigo-300 transition-colors">
                          {formatDateVN(s.date)}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-bold flex-wrap">
                          <span>{formatCleanTimeString(s.time)} - {getEndTime(formatCleanTimeString(s.time), s.duration)} ({s.duration}h)</span>
                          <span>|</span>
                          <span className="text-slate-300 font-black">{formatVND(s.price)}</span>
                          {((s.student_count ?? 1) > 1 || (s.original_student_count ?? 1) > 1) && (
                            <>
                              <span>|</span>
                              <span className={(s.student_count ?? 1) < (s.original_student_count ?? (s.student_count ?? 1)) ? 'text-amber-300 font-black bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30' : 'text-indigo-300 font-extrabold'}>
                                {s.student_count}{(s.student_count ?? 1) < (s.original_student_count ?? (s.student_count ?? 1)) ? `/${s.original_student_count}` : ''} HS ({formatVND(s.price_per_student || 0)}/HS)
                                {s.absent_students && s.absent_students.length > 0 && ` - Vắng: ${s.absent_students.join(', ')}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                        isDone
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : isCancel
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}>
                        {s.status}
                      </span>
                      <div className="p-1 rounded-lg text-slate-500 group-hover:text-white transition-colors">
                        <Edit3 className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap justify-between items-center gap-3 shrink-0">
              {onDeleteSchedule && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteScheduleScope('month');
                    setShowDeleteScheduleModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white font-black text-xs transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                  title="Xóa lịch trình này"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Xóa Lịch Trình Này</span>
                </button>
              )}

              <div className="flex items-center gap-3 ml-auto">
                <span className="hidden sm:inline text-xs font-bold text-slate-400">
                  Nhấp vào từng ca để chỉnh sửa thông tin hoặc trạng thái.
                </span>
                <button
                  onClick={() => setSelectedDetailSchedule(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-extrabold text-xs transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Schedule Confirmation Modal (Rule #13: Solid Dark Backdrop, Zero Blur) */}
      {showDeleteScheduleModal && selectedDetailSchedule && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 transition-opacity cursor-pointer"
            onClick={() => !isDeletingSchedule && setShowDeleteScheduleModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#0d1018] border border-rose-500/40 rounded-2xl p-6 shadow-2xl z-10 flex flex-col gap-4 text-left animate-mac-dropdown">
            <div className="flex items-center gap-2 text-rose-400 font-black text-base">
              <Trash2 className="h-5 w-5 shrink-0" />
              <span>Xác Nhận Xóa Lịch Trình</span>
            </div>

            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              Bạn đang chọn xóa lịch làm việc <strong className="text-white">"{selectedDetailSchedule.name}"</strong>. Vui lòng chọn phạm vi xóa:
            </p>

            {/* Scope selection cards */}
            <div className="space-y-2.5">
              <label
                onClick={() => setDeleteScheduleScope('month')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  deleteScheduleScope === 'month'
                    ? 'bg-rose-500/15 border-rose-500/40 text-white'
                    : 'bg-[#141824] border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="scheduleScope"
                  checked={deleteScheduleScope === 'month'}
                  onChange={() => setDeleteScheduleScope('month')}
                  className="mt-0.5 accent-rose-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-black block text-white">
                    Xóa trong tháng {selectedMonth} ({selectedDetailSchedule.totalShifts} ca)
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block leading-normal">
                    Xóa tất cả các ca trong tháng này. Hệ thống sẽ ghi nhận loại trừ và không tự động khôi phục lại lịch này trong tháng {selectedMonth}.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setDeleteScheduleScope('all')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  deleteScheduleScope === 'all'
                    ? 'bg-rose-500/15 border-rose-500/40 text-white'
                    : 'bg-[#141824] border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="scheduleScope"
                  checked={deleteScheduleScope === 'all'}
                  onChange={() => setDeleteScheduleScope('all')}
                  className="mt-0.5 accent-rose-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-black block text-white">
                    Xóa vĩnh viễn (tất cả các tháng)
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block leading-normal">
                    Xóa hoàn toàn lịch trình này trên toàn bộ hệ thống từ trước đến nay và không bao giờ tự động tạo lại.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={isDeletingSchedule}
                onClick={() => setShowDeleteScheduleModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-extrabold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingSchedule}
                onClick={handleConfirmDeleteSchedule}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingSchedule && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{isDeletingSchedule ? 'Đang xóa...' : 'Đồng Ý Xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

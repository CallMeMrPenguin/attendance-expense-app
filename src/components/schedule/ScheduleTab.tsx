import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  RefreshCw, 
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { 
  Session, 
  ScheduleWorkSummary, 
  StudentTuitionBreakdown,
  trunc1Dec, 
  getStudentColor, 
} from '@/lib/utils';
import CalendarMonthView from '@/components/CalendarMonthView';
import CalendarWeekView from '@/components/CalendarWeekView';
import { ScheduleHeader } from './ScheduleHeader';
import { ScheduleStatsView } from './ScheduleStatsView';
import { ScheduleDetailModal } from './ScheduleDetailModal';
import { DeleteScheduleModal } from './DeleteScheduleModal';

export interface ScheduleTabProps {
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
      const sortedSessions = [...sessList].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || '').localeCompare(b.time || '');
      });

      const sample = sortedSessions[0];
      const color = sample.color || getStudentColor(name);
      const loai_hinh = (sample.loai_hinh || sample.loai_hinh_lich || 'co_dinh') as 'co_dinh' | 'tam_thoi';
      const income_category = sample.income_category || sample.category || 'Giáo dục';
      const price = Number(sample.price) || 0;
      const duration = Number(sample.duration) || 2;
      const time = sample.time || '18:00';
      const student_count = sample.student_count || 1;
      const price_per_student = sample.price_per_student || (student_count > 0 ? Math.round(price / student_count) : price);

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

      let classStudentNames: string[] = sample.student_names || [];
      if (classStudentNames.length === 0 && (sample.original_student_count || student_count) > 1) {
        const count = sample.original_student_count || student_count;
        classStudentNames = Array.from({ length: count }, (_, i) => `Học sinh ${i + 1}`);
      }

      const studentBreakdowns: StudentTuitionBreakdown[] = [];
      if (classStudentNames.length > 0) {
        classStudentNames.forEach((sName) => {
          let sTotal = 0;
          let sCompleted = 0;
          let sAbsent = 0;
          const sAbsentDates: string[] = [];

          sortedSessions.forEach((s) => {
            const isSessionCompleted = s.status === 'Đã làm' || s.status === 'Đã dạy';
            sTotal++;

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

    return results.sort((a, b) => b.totalShifts - a.totalShifts || a.name.localeCompare(b.name));
  }, [sessions]);

  return (
    <div className="space-y-6 animate-mac-dropdown">
      {/* Scheduler Header & KPI Cards */}
      <ScheduleHeader
        totalSessions={totalSessions}
        completedSessions={completedSessions}
        earnedIncome={earnedIncome}
        projectedIncome={projectedIncome}
        teachers={teachers}
        activeTeacherName={activeTeacherName}
        setActiveTeacherName={setActiveTeacherName}
        schedulesCount={schedulesSummary.length}
      />

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
              <span>Thêm Lịch Trình</span>
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
              Hãy click nút "Thêm Lịch Trình" phía trên để khởi tạo lịch làm.
            </p>
          </div>
        ) : currentView === 'stats' ? (
          <ScheduleStatsView
            schedulesSummary={schedulesSummary}
            selectedMonth={selectedMonth}
            onSelectDetailSchedule={setSelectedDetailSchedule}
            onSelectSession={setSelectedSession}
            onOpenEditModal={() => setEditModalOpen(true)}
          />
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
      <ScheduleDetailModal
        schedule={selectedDetailSchedule}
        selectedMonth={selectedMonth}
        onClose={() => setSelectedDetailSchedule(null)}
        onSelectSession={(s) => {
          setSelectedSession(s);
          setEditModalOpen(true);
        }}
        onOpenEditModal={() => setEditModalOpen(true)}
        onOpenDeleteScheduleModal={() => {
          setDeleteScheduleScope('month');
          setShowDeleteScheduleModal(true);
        }}
        copiedId={copiedId}
        handleCopyText={handleCopyText}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteScheduleModal
        isOpen={showDeleteScheduleModal}
        schedule={selectedDetailSchedule}
        selectedMonth={selectedMonth}
        scope={deleteScheduleScope}
        setScope={setDeleteScheduleScope}
        isDeleting={isDeletingSchedule}
        onClose={() => setShowDeleteScheduleModal(false)}
        onConfirm={handleConfirmDeleteSchedule}
      />
    </div>
  );
}

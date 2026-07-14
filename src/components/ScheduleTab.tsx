import React, { useState } from 'react';
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
  AlertCircle 
} from 'lucide-react';
import { formatVND, Session } from '@/lib/utils';
import CalendarMonthView from '@/components/CalendarMonthView';
import CalendarWeekView from '@/components/CalendarWeekView';

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
  currentView: 'month' | 'week';
  setCurrentView: (view: 'month' | 'week') => void;
  loading: boolean;
  sessions: Session[];
  setAddModalOpen: (open: boolean) => void;
  setSelectedSession: (session: Session | null) => void;
  setEditModalOpen: (open: boolean) => void;
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
  setEditModalOpen
}: ScheduleTabProps) {
  const [heroTeacherDropOpen, setHeroTeacherDropOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  return (
    <div className="space-y-6 animate-mac-dropdown">
      
      {/* Scheduler identity */}
      <section className="relative flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
        <div className="space-y-1 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-extrabold tracking-wider uppercase mb-1 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(123,97,255,1)]"></span>
            <span>Tổng quan giảng dạy</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
            Lịch Trình Giảng Dạy & Chấm Công
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-wide pt-0.5">
            {totalSessions > 0 
              ? `Tháng này bạn có ${totalSessions} ca dạy với tổng doanh thu dự kiến ${formatVND(projectedIncome)}.`
              : 'Hiện tại chưa có lịch ca dạy nào được tạo cho tháng này.'
            }
          </p>
        </div>

        {/* Action button & Month Selector */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 z-10" data-picker>
          {/* Hero — Teacher Dropdown (Admin only) */}
          {currentUser.role === 'admin' && teachers.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setHeroTeacherDropOpen(o=>!o)}
                className="flex items-center gap-2 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-white text-xs font-bold rounded-xl px-3.5 py-2.5 cursor-pointer focus:outline-none transition-all shadow-lg"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
                <span>{activeTeacherName}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${heroTeacherDropOpen?'rotate-180':''}`}/>
              </button>
              {heroTeacherDropOpen && (
                <div className="absolute top-full mt-2 left-0 z-[200] min-w-full w-max bg-[#0d1018] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-xl animate-mac-dropdown origin-top-left">
                  {teachers.map(t=>(
                    <button key={t} onClick={()=>{setActiveTeacherName(t);setHeroTeacherDropOpen(false);}} className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-left transition-colors cursor-pointer ${t===activeTeacherName?'bg-indigo-500/20 text-indigo-300':'text-slate-300 hover:bg-white/[0.05] hover:text-white'}`}>
                      {t===activeTeacherName&&<Check className="h-3 w-3 text-indigo-400 shrink-0"/>}
                      <span className={t===activeTeacherName?'':'ml-5'}>{t}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Dominating KPI Cards */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 text-left">
        {/* KPI 1 */}
        <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Ca dạy trong tháng</span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-[0_0_12px_rgba(123,97,255,0.3)] shrink-0">
              <CalendarIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={String(totalSessions)}>
              {totalSessions}
            </span>
          </div>
          <div className="mt-2 flex">
            <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-md">
              Tổng ca dạy
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Ca hoàn thành</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={String(completedSessions)}>
              {completedSessions}
            </span>
          </div>
          <div className="mt-2 flex">
            {totalSessions > 0 && (
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                ↑ {Math.round((completedSessions / totalSessions) * 100)}%
              </span>
            )}
          </div>
        </div>

        {/* KPI 3 */}
        <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Thu nhập thực tế</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.3)] shrink-0">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={formatVND(earnedIncome)}>
              {formatVND(earnedIncome)}
            </span>
          </div>
          <div className="mt-2 flex">
            <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md">
              Đã giảng dạy
            </span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Thu nhập dự kiến</span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={formatVND(projectedIncome)}>
              {formatVND(projectedIncome)}
            </span>
          </div>
          <div className="mt-2 flex">
            <span className="text-[10px] font-extrabold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-md">
              Thu nhập tối đa
            </span>
          </div>
        </div>
      </section>

      {/* Timetable view */}
      <section className="flex-grow flex flex-col min-h-[480px]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-[#5c36f5] shadow-[0_0_10px_rgba(92,54,245,1)]"></div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Lịch biểu giảng dạy học sinh
            </h3>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* Thêm ca dạy button */}
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-1.5 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-[11px] rounded-xl shadow-[0_4px_12px_rgba(92,54,245,0.35)] hover:scale-[1.02] transition-all cursor-pointer border border-white/20 select-none"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm Ca Dạy Nhanh</span>
            </button>

            {/* Month Selector dropdown */}
            <div className="relative" data-picker>
              <button
                onClick={() => { setMonthPickerOpen(o => !o); setPickerYear(parseInt(selectedMonth.split('-')[0])); }}
                className="flex items-center gap-2 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-white text-[11px] font-bold rounded-xl px-3.5 py-1.5 cursor-pointer transition-all shadow-lg"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="font-black">
                  {(() => { const [y,m]=selectedMonth.split('-'); return ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'][parseInt(m)-1]+' '+y; })()}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${monthPickerOpen?'rotate-180':''}`}/>
              </button>
              {monthPickerOpen && (
                <div className="absolute top-full mt-2 right-0 z-[200] w-64 bg-[#0d1018] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-4 backdrop-blur-xl animate-mac-dropdown origin-top-right">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={()=>setPickerYear(y=>y-1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronLeft className="h-4 w-4"/></button>
                    <span className="text-sm font-black text-white">{pickerYear}</span>
                    <button onClick={()=>setPickerYear(y=>y+1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronRight className="h-4 w-4"/></button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Th.1','Th.2','Th.3','Th.4','Th.5','Th.6','Th.7','Th.8','Th.9','Th.10','Th.11','Th.12'].map((mn,i)=>{
                      const val=`${pickerYear}-${String(i+1).padStart(2,'0')}`;
                      const isActive=val===selectedMonth;
                      return(
                        <button key={mn} onClick={()=>{setSelectedMonth(val);setMonthPickerOpen(false);}} className={`py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${isActive?'bg-[#5c36f5] text-white shadow-[0_0_12px_rgba(92,54,245,0.5)]':'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}>{mn}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* View Switcher slider */}
            <div className="relative flex bg-[#0d1018] border border-white/10 p-1 rounded-xl">
              <div
                className="absolute top-1 bottom-1 rounded-[10px] bg-[#5c36f5] shadow-[0_0_16px_rgba(92,54,245,0.55)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none"
                style={{
                  left: '4px',
                  width: 'calc(50% - 4px)',
                  transform: currentView === 'month' ? 'translateX(0)' : 'translateX(100%)',
                }}
              />
              <button
                onClick={() => setCurrentView('month')}
                className={`relative z-10 px-4 py-1.5 text-[10px] font-black rounded-[10px] transition-colors duration-300 ${
                  currentView === 'month' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                LỊCH THÁNG
              </button>
              <button
                onClick={() => setCurrentView('week')}
                className={`relative z-10 px-4 py-1.5 text-[10px] font-black rounded-[10px] transition-colors duration-300 ${
                  currentView === 'week' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                LỊCH TUẦN
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="calendar-container-depth flex flex-col items-center justify-center p-16 text-slate-400 gap-3 min-h-[380px] h-full">
            <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
            <span className="font-extrabold text-sm text-slate-300">Đang tải dữ liệu từ database...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="calendar-container-depth flex flex-col items-center justify-center py-20 px-6 text-center min-h-[380px] h-full bg-[#141824]">
            <div className="h-16 w-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 shadow-sm">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black text-white">
              Chưa có lịch dạy học nào trong tháng {selectedMonth}
            </h3>
            <p className="text-xs text-slate-400 mt-2 max-w-md font-medium">
              Hãy click nút "Thêm Ca Dạy Nhanh" phía trên để khởi tạo ca học.
            </p>
          </div>
        ) : (
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

    </div>
  );
}

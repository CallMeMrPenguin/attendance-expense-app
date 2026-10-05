import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Coins,
  Users,
  ChevronDown,
  Check,
} from 'lucide-react';
import { formatVND, trunc1Dec } from '@/lib/utils';

interface ScheduleHeaderProps {
  totalSessions: number;
  completedSessions: number;
  earnedIncome: number;
  projectedIncome: number;
  teachers: string[];
  activeTeacherName: string;
  setActiveTeacherName: (name: string) => void;
  schedulesCount: number;
}

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  totalSessions,
  completedSessions,
  earnedIncome,
  projectedIncome,
  teachers,
  activeTeacherName,
  setActiveTeacherName,
  schedulesCount,
}) => {
  const [heroTeacherDropOpen, setHeroTeacherDropOpen] = useState(false);

  return (
    <>
      {/* Scheduler Header */}
      <section className="relative flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
        <div className="space-y-1 max-w-2xl relative z-10">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
            Lịch Trình
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-wide pt-0.5">
            {totalSessions > 0 
              ? `Tháng này bạn có ${totalSessions} lịch làm việc (đã hoàn thành ${completedSessions} buổi | ${schedulesCount} lịch làm khác nhau).`
              : 'Hiện tại chưa có lịch trình nào được tạo cho tháng này.'
            }
          </p>
        </div>

        {/* Action button & 2-User View Segmented Control */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 z-10" data-picker>
          {/* 2-User View Segmented Control (Rule #7) */}
          {teachers.length > 0 && (() => {
            const mainTeachers = teachers.filter(t => t === 'ADMIN' || t === 'Phạm Thị Thu Trang');
            const displayList = mainTeachers.length >= 2 ? mainTeachers : teachers.slice(0, 2);
            const otherTeachers = teachers.filter(t => !displayList.includes(t));
            const activeIdx = displayList.indexOf(activeTeacherName);
            const selectedIdx = activeIdx >= 0 ? activeIdx : 0;
            const N = displayList.length;

            return (
              <div className="flex items-center gap-2 select-none">
                <div className="relative flex bg-[#0d1018] p-1 rounded-xl border border-white/10 text-xs shrink-0 font-bold select-none min-w-[260px] shadow-lg">
                  <div
                    className="absolute top-1 bottom-1 rounded-lg bg-[#5c36f5] shadow-[0_0_14px_rgba(92,54,245,0.5)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none"
                    style={{
                      left: selectedIdx === 0 ? '4px' : `calc( (100% / ${N}) * ${selectedIdx} + 1px )`,
                      width: `calc( (100% / ${N}) - 4px )`,
                    }}
                  />
                  {displayList.map((t) => {
                    const isActive = t === activeTeacherName;
                    const label = t === 'ADMIN' ? 'Hưng (Admin)' : (t === 'Phạm Thị Thu Trang' ? 'Thu Trang' : t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setActiveTeacherName(t);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('preferred_schedule_teacher', t);
                          }
                        }}
                        className={`flex-1 relative z-10 py-1.5 px-3 text-center transition-colors cursor-pointer text-xs font-black truncate ${
                          isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* If there are any other secondary teachers */}
                {otherTeachers.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setHeroTeacherDropOpen(o => !o)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all shadow-md ${
                        otherTeachers.includes(activeTeacherName)
                          ? 'bg-[#5c36f5]/20 border-indigo-500/50 text-indigo-300'
                          : 'bg-[#121624] border-white/10 text-slate-400 hover:text-white'
                      }`}
                      title="Giáo viên khác"
                    >
                      <Users className="h-3.5 w-3.5 text-slate-300" />
                      <span className="text-[11px] font-bold">{otherTeachers.includes(activeTeacherName) ? activeTeacherName : 'Khác'}</span>
                      <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${heroTeacherDropOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {heroTeacherDropOpen && (
                      <div className="absolute top-full mt-2 right-0 z-[200] min-w-[160px] bg-[#0d1018] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-mac-dropdown origin-top-right">
                        {otherTeachers.map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setActiveTeacherName(t);
                              setHeroTeacherDropOpen(false);
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('preferred_schedule_teacher', t);
                              }
                            }}
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
            );
          })()}
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
                  {schedulesCount} lịch làm | Tổng số buổi
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
    </>
  );
};

export default ScheduleHeader;

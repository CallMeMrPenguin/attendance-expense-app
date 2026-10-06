import React, { useMemo } from 'react';
import { Clock, Eye } from 'lucide-react';
import { 
  formatVND, 
  Session, 
  ScheduleWorkSummary, 
  trunc1Dec, 
  formatDateVN, 
  getEndTime, 
  formatCleanTimeString 
} from '@/lib/utils';
import { DataTable } from '@/components/DataTable';
import { ColumnDef } from '@tanstack/react-table';

interface ScheduleStatsViewProps {
  schedulesSummary: ScheduleWorkSummary[];
  selectedMonth: string;
  onSelectDetailSchedule: (schedule: ScheduleWorkSummary) => void;
  onSelectSession: (session: Session) => void;
  onOpenEditModal: () => void;
}

export function ScheduleStatsView({
  schedulesSummary,
  selectedMonth,
  onSelectDetailSchedule,
  onSelectSession,
  onOpenEditModal,
}: ScheduleStatsViewProps) {
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
                onSelectDetailSchedule(item);
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
  ], [onSelectDetailSchedule]);

  return (
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
                onClick={() => onSelectDetailSchedule(item)}
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
                  {item.sessions.map((s, sIdx) => {
                    const isDone = s.status === 'Đã làm' || s.status === 'Đã dạy';
                    const isCancel = s.status === 'Hủy';
                    const isReduced = (s.student_count ?? 1) < (s.original_student_count ?? (s.student_count ?? 1));
                    return (
                      <div
                        key={s.id || `session-grid-${s.date}-${s.time}-${sIdx}`}
                        onClick={() => {
                          onSelectSession(s);
                          onOpenEditModal();
                        }}
                        className={`p-2.5 rounded-xl bg-[#141824] hover:bg-[#1c2234] border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-sm ${
                          isDone ? 'opacity-65 bg-[#0f131f]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-[11px] font-black truncate ${isDone ? 'text-slate-400' : 'text-white'}`}>
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
                              ? 'bg-emerald-500/10 text-emerald-400/70 border border-emerald-500/20'
                              : isCancel
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            {s.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                          <span>{formatCleanTimeString(s.time)} - {getEndTime(formatCleanTimeString(s.time), s.duration)}</span>
                          <span className={`font-black ${isReduced ? 'text-amber-400' : isDone ? 'text-slate-400' : 'text-slate-200'}`}>{formatVND(s.price)}</span>
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
  );
}

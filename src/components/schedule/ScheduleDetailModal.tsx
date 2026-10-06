import React from 'react';
import { X, Users, Copy, Check, Edit3, Trash2 } from 'lucide-react';
import {
  ScheduleWorkSummary,
  Session,
  formatVND,
  formatDateVN,
  formatCleanTimeString,
  getEndTime
} from '@/lib/utils';

interface ScheduleDetailModalProps {
  schedule: ScheduleWorkSummary | null;
  selectedMonth: string;
  onClose: () => void;
  onSelectSession: (s: Session) => void;
  onOpenEditModal: () => void;
  onOpenDeleteScheduleModal?: () => void;
  copiedId: string | null;
  handleCopyText: (text: string, id: string) => void;
}

export const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({
  schedule,
  selectedMonth,
  onClose,
  onSelectSession,
  onOpenEditModal,
  onOpenDeleteScheduleModal,
  copiedId,
  handleCopyText,
}) => {
  if (!schedule) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/85 transition-opacity cursor-pointer"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-[#0d1018] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] flex flex-col text-left animate-mac-dropdown">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="h-4 w-4 rounded-full shrink-0 shadow-[0_0_10px_currentColor]"
              style={{ backgroundColor: schedule.color, color: schedule.color }}
            />
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white truncate">
                {schedule.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                  schedule.loai_hinh === 'tam_thoi'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                }`}>
                  {schedule.loai_hinh === 'tam_thoi' ? 'Tạm thời' : 'Cố định'}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  | {schedule.income_category}
                </span>
                <span className="text-xs font-black text-slate-300">
                  | {formatVND(schedule.price)} / ca
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Metrics Bar inside Modal */}
        <div className="grid grid-cols-4 gap-2.5 my-4 shrink-0 select-none">
          <div className="p-3 rounded-xl bg-[#141824] border border-white/5 text-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Tổng số ca</span>
            <span className="text-base font-black text-white mt-0.5 block">{schedule.totalShifts} ca</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">Đã làm</span>
            <span className="text-base font-black text-emerald-300 mt-0.5 block">{schedule.completedShifts} ca</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider block">Chưa làm</span>
            <span className="text-base font-black text-amber-300 mt-0.5 block">{schedule.pendingShifts} ca</span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-wider block">Thực nhận</span>
            <span className="text-xs font-black text-cyan-300 mt-1 block">{formatVND(schedule.earnedIncome)}</span>
          </div>
        </div>

        {/* Multi-Student Tuition Breakdown Card */}
        {schedule.student_breakdowns && schedule.student_breakdowns.length > 1 && (
          <div className="p-4 rounded-2xl bg-[#141824] border border-indigo-500/30 space-y-3 shrink-0 shadow-lg my-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Bảng Tính Học Phí Từng Học Sinh ({schedule.student_breakdowns.length} HS)
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const lines = [
                    `BẢNG TỔNG KẾT HỌC PHÍ THÁNG ${selectedMonth}`,
                    `Lớp: ${schedule.name}`,
                    `Đơn giá: ${formatVND(schedule.price_per_student || 0)} / buổi / học sinh`,
                    `---------------------------------`,
                    ...schedule.student_breakdowns!.map((st, i) => {
                      const absentText = st.absentSessions > 0 ? ` (Nghỉ ${st.absentSessions} buổi: ${st.absentDates.map(d => formatDateVN(d)).join(', ')})` : '';
                      return `${i + 1}. ${st.name}: ${st.completedSessions} buổi${absentText} ➔ ${formatVND(st.totalFee)}`;
                    }),
                    `---------------------------------`,
                    `Tổng học phí cả lớp: ${formatVND(schedule.student_breakdowns!.reduce((sum, st) => sum + st.totalFee, 0))}`
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
              {schedule.student_breakdowns.map((st, i) => {
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
                            `THÔNG BÁO HỌC PHÍ THÁNG ${selectedMonth}`,
                            `- Lớp: ${schedule.name}`,
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
            Danh sách chi tiết các buổi ({schedule.sessions.length} ca trong tháng {selectedMonth}):
          </span>

          {schedule.sessions.map((s, idx) => {
            const isDone = s.status === 'Đã làm' || s.status === 'Đã dạy';
            const isCancel = s.status === 'Hủy';
            return (
              <div
                key={s.id || `session-detail-${s.date}-${s.time}-${idx}`}
                onClick={() => {
                  onSelectSession(s);
                  onOpenEditModal();
                }}
                className={`p-3 rounded-xl bg-[#141824] hover:bg-[#1a2032] border border-white/5 hover:border-indigo-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-sm group ${
                  isDone ? 'opacity-65' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-black text-slate-500 w-5 text-center">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <span className={`text-xs font-extrabold block group-hover:text-indigo-300 transition-colors ${isDone ? 'text-slate-300' : 'text-white'}`}>
                      {formatDateVN(s.date)}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-bold flex-wrap">
                      <span>{formatCleanTimeString(s.time)} - {getEndTime(formatCleanTimeString(s.time), s.duration)} ({s.duration}h)</span>
                      <span>|</span>
                      <span className={`font-black ${isDone ? 'text-slate-400' : 'text-slate-300'}`}>{formatVND(s.price)}</span>
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
                      ? 'bg-emerald-500/10 text-emerald-400/70 border border-emerald-500/20'
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
          {onOpenDeleteScheduleModal && (
            <button
              type="button"
              onClick={onOpenDeleteScheduleModal}
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
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-extrabold text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDetailModal;

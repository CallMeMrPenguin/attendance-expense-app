import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { ScheduleWorkSummary } from '@/lib/utils';

interface DeleteScheduleModalProps {
  isOpen: boolean;
  schedule: ScheduleWorkSummary | null;
  selectedMonth: string;
  scope: 'month' | 'all';
  setScope: (scope: 'month' | 'all') => void;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteScheduleModal: React.FC<DeleteScheduleModalProps> = ({
  isOpen,
  schedule,
  selectedMonth,
  scope,
  setScope,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !schedule) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/85 transition-opacity cursor-pointer"
        onClick={() => !isDeleting && onClose()}
      />
      <div className="relative w-full max-w-md bg-[#0d1018] border border-rose-500/40 rounded-2xl p-6 shadow-2xl z-10 flex flex-col gap-4 text-left animate-mac-dropdown">
        <div className="flex items-center gap-2 text-rose-400 font-black text-base">
          <Trash2 className="h-5 w-5 shrink-0" />
          <span>Xác Nhận Xóa Lịch Trình</span>
        </div>

        <p className="text-xs text-slate-300 font-medium leading-relaxed">
          Bạn đang chọn xóa lịch làm việc <strong className="text-white">"{schedule.name}"</strong>. Vui lòng chọn phạm vi xóa:
        </p>

        {/* Scope selection cards */}
        <div className="space-y-2.5">
          <label
            onClick={() => setScope('month')}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              scope === 'month'
                ? 'bg-rose-500/15 border-rose-500/40 text-white'
                : 'bg-[#141824] border-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            <input
              type="radio"
              name="scheduleScope"
              checked={scope === 'month'}
              onChange={() => setScope('month')}
              className="mt-0.5 accent-rose-500 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-black block text-white">
                Xóa trong tháng {selectedMonth} ({schedule.totalShifts} ca)
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block leading-normal">
                Xóa tất cả các ca trong tháng này. Hệ thống sẽ ghi nhận loại trừ và không tự động khôi phục lại lịch này trong tháng {selectedMonth}.
              </span>
            </div>
          </label>

          <label
            onClick={() => setScope('all')}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              scope === 'all'
                ? 'bg-rose-500/15 border-rose-500/40 text-white'
                : 'bg-[#141824] border-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            <input
              type="radio"
              name="scheduleScope"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
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
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-extrabold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all cursor-pointer disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{isDeleting ? 'Đang xóa...' : 'Đồng Ý Xóa'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteScheduleModal;

import React from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { formatDateVN, Session } from '@/lib/utils';

interface SiblingCheck {
  id?: string;
  checked: boolean;
  date: string;
  day_of_week: string;
  time: string;
  duration: number;
}

interface SessionOverlapDeleteModalsProps {
  session: Session;
  showOverlapModal: boolean;
  warningMsg: string;
  onCancelOverlap: () => void;
  onConfirmOverlap: () => void;
  showDeleteConfirmModal: boolean;
  deleteScope: 'single' | 'month' | 'all';
  setDeleteScope: (scope: 'single' | 'month' | 'all') => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  siblings: SiblingCheck[];
  loading: boolean;
}

export const SessionOverlapDeleteModals: React.FC<SessionOverlapDeleteModalsProps> = ({
  session,
  showOverlapModal,
  warningMsg,
  onCancelOverlap,
  onConfirmOverlap,
  showDeleteConfirmModal,
  deleteScope,
  setDeleteScope,
  onCancelDelete,
  onConfirmDelete,
  siblings,
  loading,
}) => {
  return (
    <>
      {/* Overlap Warning Custom Modal */}
      {showOverlapModal && (
        <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 animate-mac-backdrop">
          <div className="bg-[#121624] border border-amber-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 text-left animate-mac-modal">
            <div className="flex items-center gap-2 text-amber-400 font-black text-base">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>Phát Hiện Trùng / Gần Lịch Dạy</span>
            </div>
            <pre className="text-xs text-slate-300 bg-slate-900/80 p-3.5 rounded-xl whitespace-pre-wrap font-sans leading-relaxed max-h-[220px] overflow-y-auto border border-white/5">
              {warningMsg}
            </pre>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancelOverlap}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={onConfirmOverlap}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
              >
                Vẫn Lưu Ca Dạy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Sessions Custom Modal with Scope Selection */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/85 z-[120] flex items-center justify-center p-4 animate-mac-backdrop">
          <div className="bg-[#121624] border border-rose-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 text-left animate-mac-modal">
            <div className="flex items-center gap-2 text-rose-400 font-black text-base">
              <Trash2 className="h-5 w-5 shrink-0" />
              <span>Xác Nhận Xóa Lịch / Ca Dạy</span>
            </div>

            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              Bạn đang thao tác với ca dạy của <strong className="text-white">"{session.job_name || session.student_name}"</strong>. Vui lòng chọn phạm vi xóa:
            </p>

            {/* Scope Selection Options */}
            <div className="space-y-2.5">
              <label
                onClick={() => setDeleteScope('single')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  deleteScope === 'single'
                    ? 'bg-rose-500/15 border-rose-500/40 text-white'
                    : 'bg-[#0d1018] border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="editDeleteScope"
                  checked={deleteScope === 'single'}
                  onChange={() => setDeleteScope('single')}
                  className="mt-0.5 accent-rose-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-black block text-white">
                    Chỉ xóa ca này (ngày {formatDateVN(session.date)})
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block leading-normal">
                    Chỉ xóa buổi học vào ngày {formatDateVN(session.date)}, các buổi học khác trong tháng vẫn giữ nguyên.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setDeleteScope('month')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  deleteScope === 'month'
                    ? 'bg-rose-500/15 border-rose-500/40 text-white'
                    : 'bg-[#0d1018] border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="editDeleteScope"
                  checked={deleteScope === 'month'}
                  onChange={() => setDeleteScope('month')}
                  className="mt-0.5 accent-rose-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-black block text-white">
                    Xóa tất cả ca trong tháng {session.month_year} ({siblings.filter((s) => s.id).length || 1} ca)
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block leading-normal">
                    Hủy toàn bộ lịch này trong tháng {session.month_year} và không tự động khôi phục lại.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setDeleteScope('all')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  deleteScope === 'all'
                    ? 'bg-rose-500/15 border-rose-500/40 text-white'
                    : 'bg-[#0d1018] border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="editDeleteScope"
                  checked={deleteScope === 'all'}
                  onChange={() => setDeleteScope('all')}
                  className="mt-0.5 accent-rose-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-black block text-white">
                    Xóa vĩnh viễn lịch làm này (tất cả các tháng)
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block leading-normal">
                    Xóa hoàn toàn lịch này trên toàn bộ hệ thống từ trước đến nay và không bao giờ tự động tạo lại.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={loading}
                onClick={onCancelDelete}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onConfirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{loading ? 'Đang xóa...' : 'Đồng Ý Xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SessionOverlapDeleteModals;

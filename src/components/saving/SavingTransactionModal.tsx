import React from 'react';
import { createPortal } from 'react-dom';
import { Shield, TrendingUp, X } from 'lucide-react';
import { formatNumberDots, parseNumberDots } from '@/lib/utils';
import CustomDatePicker from '@/components/CustomDatePicker';

interface SavingTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quickFund: 'emergency' | 'accumulation';
  quickAction: 'deposit' | 'withdraw';
  quickAmount: string;
  setQuickAmount: (val: string) => void;
  quickDate: string;
  setQuickDate: (val: string) => void;
  quickNote: string;
  setQuickNote: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SavingTransactionModal: React.FC<SavingTransactionModalProps> = ({
  isOpen,
  onClose,
  quickFund,
  quickAction,
  quickAmount,
  setQuickAmount,
  quickDate,
  setQuickDate,
  quickNote,
  setQuickNote,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/85 z-[99999] flex items-center justify-center p-4 overflow-hidden pointer-events-auto select-none"
      onClick={onClose}
    >
      <div 
        className="bg-[#0f1320] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              quickAction === 'deposit'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
            }`}>
              {quickFund === 'emergency' ? <Shield className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {quickAction === 'deposit' ? 'Nạp Tiền Vào Quỹ' : 'Rút Tiền Khỏi Quỹ'}
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {quickFund === 'emergency' ? 'Quỹ Dự Phòng (Khẩn Cấp)' : 'Quỹ Tích Lũy (Dài Hạn)'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Số tiền giao dịch (VNĐ) *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={formatNumberDots(quickAmount)}
              onChange={(e) => setQuickAmount(parseNumberDots(e.target.value) ? parseNumberDots(e.target.value).toString() : '')}
              placeholder="VD: 5.000.000"
              className="w-full bg-[#0d1018] border border-white/10 text-base font-black text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Date selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Ngày ghi nhận *
            </label>
            <CustomDatePicker
              value={quickDate}
              onChange={setQuickDate}
            />
          </div>

          {/* Note input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Ghi chú (Tùy chọn)
            </label>
            <input
              type="text"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder={quickAction === 'deposit' ? 'Chuyển tiền vào quỹ...' : 'Rút chi tiêu phát sinh...'}
              className="w-full bg-[#0d1018] border border-white/10 text-xs font-semibold text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Impact Notice */}
          <div className={`p-3 rounded-xl border text-xs font-semibold leading-relaxed ${
            quickAction === 'deposit'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
          }`}>
            {quickAction === 'deposit' ? (
              <>
                <span className="font-black block mb-0.5">Trừ thặng dư tháng:</span>
                Khoản tiền nạp vào quỹ sẽ được tính vào Chi tiêu dòng tiền để trừ trực tiếp thặng dư của tháng {quickDate.substring(0, 7)}.
              </>
            ) : (
              <>
                <span className="font-black block mb-0.5">Cộng dòng tiền tháng:</span>
                Khoản tiền rút khỏi quỹ sẽ được tính vào Thu nhập dòng tiền để cộng trực tiếp vào thặng dư của tháng {quickDate.substring(0, 7)}.
              </>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className={`flex-1 py-2.5 font-black text-xs rounded-xl cursor-pointer transition-all shadow-md text-white ${
                quickAction === 'deposit'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
              }`}
            >
              {quickAction === 'deposit' ? 'Xác Nhận Nạp Quỹ' : 'Xác Nhận Rút Quỹ'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default SavingTransactionModal;

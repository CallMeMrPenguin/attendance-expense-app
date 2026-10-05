import React, { useState, useEffect } from 'react';
import { Wallet, X } from 'lucide-react';
import { formatNumberDots, parseNumberDots } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

interface TrangBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBalance: number;
  onSave?: (val: number) => void;
}

export const TrangBalanceModal: React.FC<TrangBalanceModalProps> = ({
  isOpen,
  onClose,
  initialBalance,
  onSave,
}) => {
  const { showToast } = useToast();
  const [trangInputVal, setTrangInputVal] = useState<string>('0');

  useEffect(() => {
    if (isOpen) {
      setTrangInputVal(formatNumberDots(initialBalance || 0));
    }
  }, [isOpen, initialBalance]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
      <div className="bg-[#0c0f1e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-[0_0_30px_rgba(168,85,247,0.3)] animate-mac-modal">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-purple-400" />
            <h3 className="text-base font-black text-white">Thiết Lập Số Dư Ban Đầu - Tài Khoản Trang</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 text-left">
          <p className="text-xs text-slate-300">
            Nhập số tiền ban đầu trong tài khoản của Trang (STK: 9981397845). Mọi giao dịch chi trả do Trang thực hiện sẽ tự động trừ vào số dư này.
          </p>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-purple-400 uppercase">Số dư ban đầu (VNĐ)</label>
            <input
              type="text"
              value={trangInputVal}
              onChange={(e) => setTrangInputVal(formatNumberDots(parseNumberDots(e.target.value)))}
              placeholder="Ví dụ: 5.000.000"
              className="w-full bg-[#0d1018] border border-purple-500/30 text-base font-black text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              const num = parseNumberDots(trangInputVal);
              if (onSave) {
                onSave(num);
                showToast('Đã cập nhật số dư ban đầu của Tài Khoản Trang!', 'success');
              }
              onClose();
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.4)]"
          >
            Lưu Thay Đổi
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrangBalanceModal;

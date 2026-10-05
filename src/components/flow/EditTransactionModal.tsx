import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, ChevronDown } from 'lucide-react';
import { formatNumberDots, parseNumberDots } from '@/lib/utils';
import CustomDatePicker from '@/components/CustomDatePicker';

interface EditTransactionModalProps {
  isOpen: boolean;
  tx: any;
  onClose: () => void;
  incomeCats: Array<{ name: string; icon?: string; note?: string }>;
  expenseCats: Array<{ name: string; icon?: string; note?: string }>;
  onSave: (tx: any) => void;
  onDelete?: (id: string) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  tx,
  onClose,
  incomeCats,
  expenseCats,
  onSave,
  onDelete,
}) => {
  const [editingTx, setEditingTx] = useState<any>(null);

  useEffect(() => {
    if (tx) {
      setEditingTx({ ...tx });
    }
  }, [tx]);

  if (!isOpen || !editingTx) return null;

  return createPortal(
    <div className="fixed inset-0 bg-[#070911]/96 z-[99999] flex items-center justify-center p-4 text-slate-100">
      <div className="bg-[#0f1320] border border-indigo-500/30 rounded-2xl w-full max-w-md p-6 relative shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-mac-dropdown">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-sm font-black text-indigo-400 tracking-wider uppercase mb-5">Sửa Giao Dịch</h3>

        <div className="relative flex bg-[#0d1018] p-1 rounded-xl border border-white/10 text-xs shrink-0 font-bold select-none w-full mb-5">
          <div
            className={`absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none ${
              editingTx.type === 'expense'
                ? 'bg-rose-500 shadow-[0_0_14px_rgba(239,68,68,0.4)]'
                : editingTx.type === 'income'
                ? 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                : 'bg-cyan-500 shadow-[0_0_14px_rgba(6,182,212,0.4)]'
            }`}
            style={{
              left: `calc( (100% / 3) * ${editingTx.type === 'expense' ? 0 : editingTx.type === 'income' ? 1 : 2} + 1px )`,
              width: 'calc( (100% / 3) - 2px )',
            }}
          />
          <button
            type="button"
            onClick={() => {
              setEditingTx((prev: any) => prev ? { ...prev, type: 'expense', category: expenseCats[0]?.name || 'Ăn uống' } : null);
            }}
            className={`flex-1 relative z-10 py-1.5 text-center text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors cursor-pointer ${
              editingTx.type === 'expense' ? 'text-white font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Chi tiêu
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTx((prev: any) => prev ? { ...prev, type: 'income', category: incomeCats[0]?.name || 'Lương' } : null);
            }}
            className={`flex-1 relative z-10 py-1.5 text-center text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors cursor-pointer ${
              editingTx.type === 'income' ? 'text-white font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Thu nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTx((prev: any) => prev ? { ...prev, type: 'exchange', category: 'Trao đổi' } : null);
            }}
            className={`flex-1 relative z-10 py-1.5 text-center text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors cursor-pointer ${
              editingTx.type === 'exchange' ? 'text-white font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Trao đổi
          </button>
        </div>

        <div className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Mô tả giao dịch</label>
            <input
              type="text"
              value={editingTx.desc || ''}
              onChange={(e) => setEditingTx((prev: any) => prev ? { ...prev, desc: e.target.value } : null)}
              className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Số tiền (đ)</label>
              <input
                type="text"
                value={formatNumberDots(editingTx.amount || 0)}
                onChange={(e) => setEditingTx((prev: any) => prev ? { ...prev, amount: parseNumberDots(e.target.value) } : null)}
                className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Ngày ghi nhận</label>
              <CustomDatePicker
                value={editingTx.date}
                onChange={(dateStr) => setEditingTx((prev: any) => prev ? { ...prev, date: dateStr } : null)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Danh mục</label>
            <div className="relative">
              {editingTx.type === 'exchange' ? (
                <div className="w-full bg-[#0d1018] border border-cyan-500/30 text-xs font-bold text-cyan-300 rounded-xl px-3.5 py-2.5">
                  Trao đổi (Lưu thông nội bộ)
                </div>
              ) : (
                <>
                  <select
                    value={editingTx.category}
                    onChange={(e) => setEditingTx((prev: any) => prev ? { ...prev, category: e.target.value } : null)}
                    className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer block"
                  >
                    {(editingTx.type === 'income' ? incomeCats : expenseCats).map((c) => (
                      <option key={c.name} value={c.name} className="bg-[#0d1018] text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </>
              )}
            </div>
            {editingTx.type === 'exchange' && (
              <p className="text-[10px] text-cyan-400/90 font-medium mt-1">
                Giao dịch loại Trao đổi không tính vào Tổng Thu nhập hay Tổng Chi tiêu.
              </p>
            )}
          </div>

          <div 
            onClick={() => setEditingTx((prev: any) => prev ? { ...prev, isRecurring: !prev.isRecurring } : null)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
              editingTx.isRecurring 
                ? 'bg-indigo-500/15 border-indigo-500/40 text-white shadow-sm' 
                : 'bg-[#0d1018] border-white/10 text-slate-400 hover:border-white/20'
            }`}
          >
            <div className="flex flex-col text-left">
              <span className="text-xs font-extrabold text-white">Giao dịch Cố định (Hằng tháng)</span>
              <span className="text-[9.5px] text-slate-400">Tự động cộng/trừ số tiền này cho các tháng tiếp theo</span>
            </div>
            <input 
              type="checkbox" 
              checked={!!editingTx.isRecurring} 
              onChange={(e) => setEditingTx((prev: any) => prev ? { ...prev, isRecurring: e.target.checked } : null)} 
              className="h-4 w-4 accent-indigo-500 cursor-pointer shrink-0" 
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            {editingTx.id && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(editingTx.id);
                  onClose();
                }}
                className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                title="Xóa giao dịch này"
              >
                <Trash2 className="h-4 w-4" />
                <span>Xóa</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(editingTx);
                onClose();
              }}
              className="flex-1 py-2.5 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(92,54,245,0.4)] transition-all hover:scale-[1.02] cursor-pointer text-center"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditTransactionModal;

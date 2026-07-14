import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

const INCOME_CATEGORIES = ['Lương', 'Giáo dục', 'Đầu tư', 'Khác'];
const EXPENSE_CATEGORIES = ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'];

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
  };
  defaultType: 'income' | 'expense' | 'saving';
  emergencyCurrent: number;
  accumulationCurrent: number;
  manualTransactions: any[];
  savingsHistory: any[];
  saveTransactions: (userId: string, data: any[]) => void;
  saveEmergencyCurrent: (userId: string, val: number) => void;
  saveAccumulationCurrent: (userId: string, val: number) => void;
  saveSavingsHistory: (userId: string, data: any[]) => void;
}

export default function TransactionModal({
  isOpen,
  onClose,
  currentUser,
  defaultType,
  emergencyCurrent,
  accumulationCurrent,
  manualTransactions,
  savingsHistory,
  saveTransactions,
  saveEmergencyCurrent,
  saveAccumulationCurrent,
  saveSavingsHistory
}: TransactionModalProps) {
  const [modalTxType, setModalTxType] = useState<'income' | 'expense' | 'saving'>('expense');
  const [modalDesc, setModalDesc] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalCategory, setModalCategory] = useState('Ăn uống');
  const [modalDate, setModalDate] = useState('');
  const [modalSavingFund, setModalSavingFund] = useState<'emergency' | 'accumulation'>('emergency');
  const [modalSavingAction, setModalSavingAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [incomeCategories, setIncomeCategories] = useState<string[]>(['Lương', 'Giáo dục', 'Đầu tư', 'Khác']);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác']);

  useEffect(() => {
    if (isOpen) {
      setModalTxType(defaultType);
      
      let incCats = ['Lương', 'Giáo dục', 'Đầu tư', 'Khác'];
      let expCats = ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'];
      if (currentUser?.id) {
        const savedIncome = localStorage.getItem(`finance_income_cats_${currentUser.id}`);
        const savedExpense = localStorage.getItem(`finance_expense_cats_${currentUser.id}`);
        if (savedIncome) incCats = JSON.parse(savedIncome).map((c: any) => c.name);
        if (savedExpense) expCats = JSON.parse(savedExpense).map((c: any) => c.name);
      }
      setIncomeCategories(incCats);
      setExpenseCategories(expCats);

      setModalCategory(defaultType === 'income' ? (incCats[0] || 'Lương') : (expCats[0] || 'Ăn uống'));
      setModalDesc('');
      setModalAmount('');
      setModalDate(new Date().toISOString().split('T')[0]);
      setModalSavingFund('emergency');
      setModalSavingAction('deposit');
    }
  }, [isOpen, defaultType, currentUser]);

  if (!isOpen) return null;

  const handleSaveModalTx = (e: React.FormEvent) => {
    e.preventDefault();
    const userId = currentUser.id;
    const amt = Number(modalAmount);

    if (!amt || amt <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0.');
      return;
    }

    if (modalTxType === 'saving') {
      let currentVal = modalSavingFund === 'emergency' ? emergencyCurrent : accumulationCurrent;
      let newVal = currentVal;
      
      if (modalSavingAction === 'deposit') {
        newVal += amt;
      } else {
        if (amt > currentVal) {
          alert('Số dư quỹ hiện hành không đủ để thực hiện rút tiền.');
          return;
        }
        newVal -= amt;
      }

      if (modalSavingFund === 'emergency') {
        saveEmergencyCurrent(userId, newVal);
      } else {
        saveAccumulationCurrent(userId, newVal);
      }

      // Add to savings history logs
      const newHist = {
        id: `sh-${Date.now()}`,
        fund: modalSavingFund,
        type: modalSavingAction,
        amount: amt,
        date: modalDate
      };
      saveSavingsHistory(userId, [newHist, ...savingsHistory]);
      alert('Đã cập nhật giao dịch quỹ tiết kiệm thành công!');
    } else {
      if (!modalDesc.trim()) {
        alert('Vui lòng điền mô tả giao dịch.');
        return;
      }
      const newTx = {
        id: `tx-${Date.now()}`,
        desc: modalDesc.trim(),
        amount: amt,
        type: modalTxType,
        category: modalCategory,
        date: modalDate
      };
      saveTransactions(userId, [newTx, ...manualTransactions]);
      alert('Đã lưu giao dịch tài chính mới!');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#090b10]/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in text-slate-100">
      <div 
        className="bg-[#0f1320] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-mac-dropdown"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-sm font-black text-indigo-400 tracking-wider uppercase mb-5">Ghi Nhận Giao Dịch</h3>

        {/* Tab switch inside modal */}
        <div className="relative flex bg-[#090b10] border border-white/5 p-1 rounded-xl w-full mb-5">
          {/* Sliding pill background */}
          <div
            className={`absolute top-1 bottom-1 rounded-[10px] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none ${
              modalTxType === 'expense'
                ? 'bg-rose-500 shadow-[0_0_14px_rgba(239,68,68,0.4)]'
                : modalTxType === 'income'
                ? 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                : 'bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.4)]'
            }`}
            style={{
              left: '4px',
              width: 'calc(33.333% - 4px)',
              transform:
                modalTxType === 'expense'
                  ? 'translateX(0)'
                  : modalTxType === 'income'
                  ? 'translateX(100%)'
                  : 'translateX(200%)',
            }}
          />
          <button
            type="button"
            onClick={() => {
              setModalTxType('expense');
              setModalCategory(expenseCategories[0] || 'Ăn uống');
            }}
            className={`relative z-10 flex-1 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors duration-300 cursor-pointer ${
              modalTxType === 'expense' ? 'text-white' : 'text-slate-455 hover:text-slate-200'
            }`}
          >
            Chi tiêu
          </button>
          <button
            type="button"
            onClick={() => {
              setModalTxType('income');
              setModalCategory(incomeCategories[0] || 'Lương');
            }}
            className={`relative z-10 flex-1 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors duration-300 cursor-pointer ${
              modalTxType === 'income' ? 'text-white' : 'text-slate-455 hover:text-slate-200'
            }`}
          >
            Thu nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setModalTxType('saving');
              setModalCategory('Khác');
            }}
            className={`relative z-10 flex-1 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors duration-300 cursor-pointer ${
              modalTxType === 'saving' ? 'text-white' : 'text-slate-455 hover:text-slate-200'
            }`}
          >
            Tiết kiệm
          </button>
        </div>

        <form onSubmit={handleSaveModalTx} className="space-y-4 text-left">
          {modalTxType === 'saving' ? (
            <>
              {/* Saving Fund Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Quỹ tiết kiệm</label>
                  <div className="relative">
                    <select
                      value={modalSavingFund}
                      onChange={(e) => setModalSavingFund(e.target.value as any)}
                      className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer block"
                    >
                      <option value="emergency" className="bg-[#0d1018] text-white">Quỹ dự phòng</option>
                      <option value="accumulation" className="bg-[#0d1018] text-white">Quỹ tích lũy</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Hành động</label>
                  <div className="relative">
                    <select
                      value={modalSavingAction}
                      onChange={(e) => setModalSavingAction(e.target.value as any)}
                      className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer block"
                    >
                      <option value="deposit" className="bg-[#0d1018] text-white">Nạp tiền (Gửi vào)</option>
                      <option value="withdraw" className="bg-[#0d1018] text-white">Rút tiền</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Description Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Mô tả giao dịch</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Ăn trưa, Nhận lương tháng..."
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </>
          )}

          {/* Amount & Date Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Số tiền (đ)</label>
              <input
                type="number"
                placeholder="Nhập số tiền..."
                value={modalAmount}
                onChange={(e) => setModalAmount(e.target.value)}
                className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Ngày ghi nhận</label>
              <input
                type="date"
                value={modalDate}
                onChange={(e) => setModalDate(e.target.value)}
                className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                required
              />
            </div>
          </div>

          {modalTxType !== 'saving' && (
            <>
              {/* Category Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Danh mục</label>
                <div className="relative">
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer block"
                  >
                    {(modalTxType === 'income' ? incomeCategories : expenseCategories).map((c) => (
                      <option key={c} value={c} className="bg-[#0d1018] text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl shadow-[0_4px_12px_rgba(92,54,245,0.3)] transition-all hover:scale-[1.02] cursor-pointer mt-4"
          >
            Lưu Giao Dịch
          </button>
        </form>
      </div>
    </div>
  );
}

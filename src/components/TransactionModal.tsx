import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Calendar } from 'lucide-react';
import { formatDateVN, formatNumberDots, parseNumberDots } from '@/lib/utils';
import CustomDatePicker from './CustomDatePicker';
import CustomSelect from './CustomSelect';
import { useToast } from '@/context/ToastContext';

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
  categoryBudgets?: Record<string, number>;
  categoryTypes?: Record<string, 'income' | 'expense'>;
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
  categoryBudgets = {},
  categoryTypes = {},
  saveTransactions,
  saveEmergencyCurrent,
  saveAccumulationCurrent,
  saveSavingsHistory
}: TransactionModalProps) {
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [modalTxType, setModalTxType] = useState<'income' | 'expense' | 'saving'>('expense');
  const [modalDesc, setModalDesc] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalCategory, setModalCategory] = useState('Ăn uống');
  const [modalDate, setModalDate] = useState('');
  const [modalSavingFund, setModalSavingFund] = useState<'emergency' | 'accumulation'>('emergency');
  const [modalSavingAction, setModalSavingAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [isRecurring, setIsRecurring] = useState(false);
  const [incomeCategories, setIncomeCategories] = useState<string[]>(['Lương', 'Giáo dục', 'Đầu tư', 'Khác']);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác']);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setModalTxType(defaultType);
      
      const budgetKeys = Object.keys(categoryBudgets);
      let incCats: string[] = [];
      let expCats: string[] = [];

      if (budgetKeys.length > 0) {
        const defaultIncomeNames = ['Lương', 'Giáo dục', 'Đầu tư', 'Gia Sư'];
        budgetKeys.forEach(cat => {
          const type = categoryTypes[cat];
          const isInc = type ? type === 'income' : defaultIncomeNames.includes(cat);
          if (isInc) {
            incCats.push(cat);
          } else {
            expCats.push(cat);
          }
        });
        if (!incCats.includes('Khác')) incCats.push('Khác');
        if (!expCats.includes('Khác')) expCats.push('Khác');
      } else {
        incCats = ['Lương', 'Giáo dục', 'Đầu tư', 'Gia Sư', 'Khác'];
        expCats = ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Xăng', 'Đi Chợ', 'Khác'];
      }

      setIncomeCategories(incCats);
      setExpenseCategories(expCats);

      setModalCategory(defaultType === 'income' ? (incCats[0] || 'Lương') : (expCats[0] || 'Ăn uống'));
      setModalDesc('');
      setModalAmount('');
      setModalDate(new Date().toISOString().split('T')[0]);
      setModalSavingFund('emergency');
      setModalSavingAction('deposit');
      setIsRecurring(false);
    }
  }, [isOpen, defaultType, currentUser, categoryBudgets, categoryTypes]);

  if (!isOpen || !mounted) return null;

  const handleSaveModalTx = (e: React.FormEvent) => {
    e.preventDefault();
    const userId = currentUser.id;
    const amt = Number(modalAmount);

    if (!amt || amt <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0.', 'error');
      return;
    }

    if (modalTxType === 'saving') {
      let currentVal = modalSavingFund === 'emergency' ? emergencyCurrent : accumulationCurrent;
      let newVal = currentVal;
      const isDeposit = modalSavingAction === 'deposit';
      const fundTitle = modalSavingFund === 'emergency' ? 'Quỹ Dự Phòng' : 'Quỹ Tích Lũy';
      
      if (isDeposit) {
        newVal += amt;
      } else {
        if (amt > currentVal) {
          showToast('Số dư quỹ hiện hành không đủ để thực hiện rút tiền.', 'error');
          return;
        }
        newVal -= amt;
      }

      if (modalSavingFund === 'emergency') {
        saveEmergencyCurrent(userId, newVal);
      } else {
        saveAccumulationCurrent(userId, newVal);
      }

      const newHist = {
        id: `sh-${Date.now()}`,
        fund: modalSavingFund,
        type: modalSavingAction,
        amount: amt,
        date: modalDate,
        note: isDeposit ? `Chuyển tiền vào ${fundTitle}` : `Rút tiền từ ${fundTitle}`
      };
      saveSavingsHistory(userId, [newHist, ...savingsHistory]);

      // Deduct from monthly money pool (expense) on deposit, or add to monthly money pool (income) on withdraw
      const savingTx = {
        id: `tx-sh-${newHist.id}`,
        desc: isDeposit ? `Chuyển tiền vào ${fundTitle}` : `Rút tiền từ ${fundTitle}`,
        amount: amt,
        type: isDeposit ? ('expense' as const) : ('income' as const),
        category: modalSavingFund === 'emergency' ? 'Tiết kiệm khẩn cấp' : 'Tích lũy dài hạn',
        date: modalDate,
        isRecurring: false,
        is_recurring: false
      };
      saveTransactions(userId, [savingTx, ...manualTransactions]);
      showToast(
        isDeposit
          ? 'Đã chuyển tiền vào quỹ tiết kiệm và trừ thặng dư tháng!'
          : 'Đã rút tiền từ quỹ tiết kiệm về dòng tiền tháng!',
        'success'
      );
    } else {
      if (!modalDesc.trim()) {
        showToast('Vui lòng điền mô tả giao dịch.', 'error');
        return;
      }
      const newTx = {
        id: `tx-${Date.now()}`,
        desc: modalDesc.trim(),
        amount: amt,
        type: modalTxType,
        category: modalCategory,
        date: modalDate,
        isRecurring: isRecurring,
        is_recurring: isRecurring
      };
      saveTransactions(userId, [newTx, ...manualTransactions]);
      showToast('Đã lưu giao dịch tài chính mới!', 'success');
    }

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-[#070911]/90 z-[99999] flex items-center justify-center p-4 overflow-hidden pointer-events-auto animate-mac-backdrop text-slate-100">
      <div 
        className="bg-[#0f1320] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-mac-modal"
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
          {/* Row 1: Description Input (for income/expense) OR Saving Fund selection (for saving) */}
          <div className={modalTxType === 'saving' ? 'hidden' : 'block'}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Mô tả giao dịch</label>
              <input
                type="text"
                placeholder="Ví dụ: Ăn trưa, Nhận lương tháng..."
                value={modalDesc}
                onChange={(e) => setModalDesc(e.target.value)}
                className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                required={modalTxType !== 'saving'}
              />
            </div>
          </div>

          <div className={modalTxType === 'saving' ? 'block' : 'hidden'}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Quỹ tiết kiệm</label>
                <CustomSelect
                  value={modalSavingFund}
                  onChange={(val) => setModalSavingFund(val as any)}
                  options={[
                    { value: 'emergency', label: 'Quỹ Dự Phòng' },
                    { value: 'accumulation', label: 'Quỹ Tích Lũy' }
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Hành động</label>
                <CustomSelect
                  value={modalSavingAction}
                  onChange={(val) => setModalSavingAction(val as any)}
                  options={[
                    { value: 'deposit', label: 'Nạp tiền (Gửi vào)' },
                    { value: 'withdraw', label: 'Rút tiền' }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Amount & Date Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Số tiền (đ)</label>
              <input
                type="text"
                placeholder="Nhập số tiền..."
                value={formatNumberDots(modalAmount)}
                onChange={(e) => setModalAmount(parseNumberDots(e.target.value) ? parseNumberDots(e.target.value).toString() : '')}
                className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Ngày ghi nhận</label>
              <CustomDatePicker
                value={modalDate}
                onChange={setModalDate}
              />
            </div>
          </div>

          {/* Row 3: Category dropdown (hidden for saving) */}
          <div className={modalTxType !== 'saving' ? 'block space-y-3' : 'hidden'}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Danh mục</label>
              <CustomSelect
                value={modalCategory}
                onChange={setModalCategory}
                options={modalTxType === 'income' ? incomeCategories : expenseCategories}
              />
            </div>

            {/* Recurring toggle box */}
            <div 
              onClick={() => setIsRecurring(!isRecurring)} 
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                isRecurring 
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
                checked={isRecurring} 
                onChange={(e) => setIsRecurring(e.target.checked)} 
                className="h-4 w-4 accent-indigo-500 cursor-pointer shrink-0" 
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl shadow-[0_4px_12px_rgba(92,54,245,0.3)] transition-all hover:scale-[1.02] cursor-pointer mt-4"
          >
            Lưu Giao Dịch
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

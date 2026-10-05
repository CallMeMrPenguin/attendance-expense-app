import React, { useState } from 'react';
import { formatVND, parseNumberDots } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { SavingTabProps } from './saving-types';
import SavingFundCards from './SavingFundCards';
import SleekDonutChart from './SleekDonutChart';
import SavingsHistorySection from './SavingsHistorySection';
import SavingTransactionModal from './SavingTransactionModal';

export const SavingTab: React.FC<SavingTabProps> = ({
  currentUser,
  emergencyCurrent,
  emergencyTarget,
  accumulationCurrent,
  accumulationTarget,
  savingsHistory,
  manualTransactions = [],
  saveEmergencyCurrent,
  saveEmergencyTarget,
  saveAccumulationCurrent,
  saveAccumulationTarget,
  saveSavingsHistory,
  saveTransactions
}) => {
  const { showToast } = useToast();

  // Quick Action Modal State
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickFund, setQuickFund] = useState<'emergency' | 'accumulation'>('emergency');
  const [quickAction, setQuickAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickDate, setQuickDate] = useState(new Date().toISOString().split('T')[0]);
  const [quickNote, setQuickNote] = useState('');

  const handleOpenQuickModal = (fund: 'emergency' | 'accumulation', action: 'deposit' | 'withdraw') => {
    setQuickFund(fund);
    setQuickAction(action);
    setQuickAmount('');
    setQuickDate(new Date().toISOString().split('T')[0]);
    setQuickNote('');
    setQuickModalOpen(true);
  };

  const handleSaveQuickFund = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseNumberDots(quickAmount);
    if (!amt || amt <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0.', 'error');
      return;
    }

    const isDeposit = quickAction === 'deposit';
    const fundTitle = quickFund === 'emergency' ? 'Quỹ Dự Phòng' : 'Quỹ Tích Lũy';
    const currentVal = quickFund === 'emergency' ? emergencyCurrent : accumulationCurrent;

    if (!isDeposit && amt > currentVal) {
      showToast('Số dư quỹ hiện tại không đủ để rút.', 'error');
      return;
    }

    const newVal = isDeposit ? currentVal + amt : currentVal - amt;

    if (quickFund === 'emergency') {
      saveEmergencyCurrent(currentUser.id, newVal);
    } else {
      saveAccumulationCurrent(currentUser.id, newVal);
    }

    const newHist = {
      id: `sh-${Date.now()}`,
      fund: quickFund,
      type: quickAction,
      amount: amt,
      date: quickDate,
      note: quickNote.trim() || (isDeposit ? `Chuyển tiền vào ${fundTitle}` : `Rút tiền từ ${fundTitle}`)
    };
    saveSavingsHistory(currentUser.id, [newHist, ...savingsHistory]);

    // Deduct from monthly money pool / surplus (expense on deposit, income on withdraw)
    if (saveTransactions) {
      const savingTx = {
        id: `tx-sh-${newHist.id}`,
        desc: quickNote.trim() || (isDeposit ? `Chuyển tiền vào ${fundTitle}` : `Rút tiền từ ${fundTitle}`),
        amount: amt,
        type: isDeposit ? ('expense' as const) : ('income' as const),
        category: quickFund === 'emergency' ? 'Tiết kiệm khẩn cấp' : 'Tích lũy dài hạn',
        date: quickDate,
        isRecurring: false,
        is_recurring: false
      };
      saveTransactions(currentUser.id, [savingTx, ...(manualTransactions || [])]);
    }

    showToast(
      isDeposit
        ? `Đã chuyển ${formatVND(amt)} vào ${fundTitle} và trừ thặng dư tháng!`
        : `Đã rút ${formatVND(amt)} từ ${fundTitle} về dòng tiền tháng!`,
      'success'
    );
    setQuickModalOpen(false);
  };

  const totalSavingsBalance = emergencyCurrent + accumulationCurrent;

  return (
    <div className="space-y-6 animate-mac-dropdown text-left select-none">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 relative">
        <div className="flex flex-col space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
            Kế Hoạch Tiết Kiệm
          </h2>
          <p className="text-slate-400 text-xs font-semibold pt-0.5">
            Bảo vệ nguồn tài sản dự trữ và tích lũy thông minh dài hạn.
          </p>
        </div>
      </div>

      {/* Top 2 Main Cards - Quỹ Dự Phòng & Quỹ Tích Lũy */}
      <SavingFundCards
        userId={currentUser.id}
        emergencyCurrent={emergencyCurrent}
        emergencyTarget={emergencyTarget}
        accumulationCurrent={accumulationCurrent}
        accumulationTarget={accumulationTarget}
        saveEmergencyTarget={saveEmergencyTarget}
        saveAccumulationTarget={saveAccumulationTarget}
        onOpenQuickModal={handleOpenQuickModal}
      />

      {/* Bottom Split Layout: Left 2/3 (Lịch sử giao dịch) + Right 1/3 (Tổng quan tài sản tiết kiệm) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 Width): Lịch sử giao dịch */}
        <SavingsHistorySection
          userId={currentUser.id}
          savingsHistory={savingsHistory}
        />

        {/* Right Column (1/3 Width): Tổng quan tài sản tiết kiệm */}
        <div className="bg-[#0a0d18] border border-white/10 rounded-3xl p-6 flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Tổng quan tài sản tiết kiệm
              </h3>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                TỔNG SỐ DƯ
              </span>
              <p className="text-3xl font-black text-white tracking-tight leading-none">
                {formatVND(totalSavingsBalance)}
              </p>
            </div>
          </div>

          {/* Sleek Donut Pie Chart */}
          <SleekDonutChart emergencyAmount={emergencyCurrent} accumulationAmount={accumulationCurrent} />
        </div>
      </div>

      {/* Quick Fund Deposit/Withdraw Modal */}
      <SavingTransactionModal
        isOpen={quickModalOpen}
        onClose={() => setQuickModalOpen(false)}
        quickFund={quickFund}
        quickAction={quickAction}
        quickAmount={quickAmount}
        setQuickAmount={setQuickAmount}
        quickDate={quickDate}
        setQuickDate={setQuickDate}
        quickNote={quickNote}
        setQuickNote={setQuickNote}
        onSubmit={handleSaveQuickFund}
      />
    </div>
  );
};

export default SavingTab;

import React, { useState, useMemo, useEffect } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { Plus } from 'lucide-react';
import {
  FlowTabProps,
  DEFAULT_CATEGORY_ICONS,
  DEFAULT_CATEGORY_NOTES,
  getCategoryPaletteColor,
  matchKeyword,
} from './flow-constants';
import MonthPickerDropdown from './MonthPickerDropdown';
import FlowSummaryCards from './FlowSummaryCards';
import FlowDonutCharts, { PieSlice } from './FlowDonutCharts';
import FlowCategoryGrid from './FlowCategoryGrid';
import FlowTransactionsSection from './FlowTransactionsSection';
import AddCategoryModal from './AddCategoryModal';
import EditCategoryModal from './EditCategoryModal';
import EditTransactionModal from './EditTransactionModal';
import ReceiptClassifyModal from './ReceiptClassifyModal';
import TrangBalanceModal from './TrangBalanceModal';

export const FlowTab: React.FC<FlowTabProps> = ({
  currentUser,
  manualTransactions = [],
  sessions = [],
  categoryBudgets = {},
  categoryTypes = {},
  categoryIcons = {},
  categoryNotes = {},
  categoryKeywords = {},
  chartSelectedMonths = [],
  bankReceipts = [],
  getActualCategoryAmount,
  handleDeleteManualTx,
  handleOpenTxModal,
  saveBudgets,
  saveTransactions,
  toggleChartMonth,
  handleClassifyReceipt,
  handleUnclassifyReceipt,
  handleSyncReceipts,
  trangAccountBalance = 0,
  saveTrangAccountBalance,
}) => {
  const [distMode, setDistMode] = useState<'month' | 'avg_year'>('month');
  const [distYear, setDistYear] = useState<number>(() => new Date().getFullYear());
  const [filterRecurring, setFilterRecurring] = useState<'all' | 'co_dinh' | 'tam_thoi' | 'bien_lai'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal states
  const [addingCatType, setAddingCatType] = useState<'income' | 'expense' | null>(null);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [editingTx, setEditingTx] = useState<any>(null);
  const [classifyingReceipt, setClassifyingReceipt] = useState<any>(null);
  const [isTrangModalOpen, setIsTrangModalOpen] = useState(false);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<{ type: 'income' | 'expense'; index: number; name: string } | null>(null);

  // Category State setup
  const [incomeCats, setIncomeCats] = useState<Array<{ name: string; icon: string; note: string; keywords?: string }>>([]);
  const [expenseCats, setExpenseCats] = useState<Array<{ name: string; icon: string; note: string; keywords?: string }>>([]);

  useEffect(() => {
    const rawKeys = Object.keys(categoryBudgets || {}).filter(k => !k.startsWith('__'));
    const inList: Array<{ name: string; icon: string; note: string; keywords?: string }> = [];
    const exList: Array<{ name: string; icon: string; note: string; keywords?: string }> = [];

    const defaultIn = ['Lương', 'Giáo dục', 'Đầu tư', 'Gia Sư', 'Thu Nợ'];
    const defaultEx = [
      'Ăn uống', 'Di chuyển', 'Xăng', 'Đi Chợ', 'Shopping', 'Quần Áo', 'Mỹ Phẩm', 'Làm Mặt',
      'Hóa đơn', 'Hóa Đơn', 'Photo', 'Giải trí', 'Giải Trí', 'Công Nghệ', 'Gia Đình',
      'Bảo Dưỡng Xe', 'Trả Nợ', 'Nhu Yếu Phẩm', 'Đăng Ký Gói', 'Sai Số', 'Chỉnh Sửa Sai Số',
      'Trao đổi', 'Tiết kiệm', 'Tiết kiệm khẩn cấp', 'Tích lũy dài hạn', 'Sức khỏe',
      'Nhà cửa', 'Cà phê', 'Du lịch', 'Khác'
    ];

    const allKeys = Array.from(new Set([...defaultIn, ...defaultEx, ...rawKeys]));

    allKeys.forEach(name => {
      const type = categoryTypes[name] || (defaultIn.includes(name) ? 'income' : 'expense');
      const icon = categoryIcons[name] || DEFAULT_CATEGORY_ICONS[name] || (type === 'income' ? 'TrendingUp' : 'Coins');
      const note = categoryNotes[name] || DEFAULT_CATEGORY_NOTES[name] || '';
      const kw = categoryKeywords[name] || '';

      if (type === 'income') {
        if (!inList.some(c => c.name === name)) inList.push({ name, icon, note, keywords: kw });
      } else {
        if (!exList.some(c => c.name === name)) exList.push({ name, icon, note, keywords: kw });
      }
    });

    setIncomeCats(inList);
    setExpenseCats(exList);
  }, [categoryBudgets, categoryTypes, categoryIcons, categoryNotes, categoryKeywords]);

  const getCategoryIconName = (cat: string, type: 'income' | 'expense') => {
    return categoryIcons[cat] || DEFAULT_CATEGORY_ICONS[cat] || (type === 'income' ? 'TrendingUp' : 'Coins');
  };

  const isTxInSelectedMonths = (t: any, monthsList: string[]) => {
    if (!monthsList || monthsList.length === 0) return true;
    const tMonth = (t.date || '').substring(0, 7);
    return monthsList.includes(tMonth);
  };

  // Filtered Bank Receipts
  const filteredBankReceipts = useMemo(() => {
    return (bankReceipts || []).filter(r => {
      if (!chartSelectedMonths || chartSelectedMonths.length === 0) return true;
      const rDate = r.trans_date || r.created_at || '';
      const rMonth = rDate.substring(0, 7);
      return chartSelectedMonths.includes(rMonth);
    });
  }, [bankReceipts, chartSelectedMonths]);

  // Classified Bank Receipts mapped to Transactions
  const receiptTransactions = useMemo(() => {
    return (bankReceipts || [])
      .filter(r => r.status === 'classified' && r.category)
      .map(r => ({
        id: `tx-receipt-${r.id}`,
        desc: r.details || `Biên lai ${r.order_number || ''}`,
        amount: Number(r.amount) || 0,
        type: r.type || 'expense',
        category: r.category,
        date: r.trans_date || (r.created_at ? r.created_at.substring(0, 10) : ''),
        isManual: true,
        isRecurring: false,
        isFromReceipt: true,
        orderNumber: r.order_number
      }));
  }, [bankReceipts]);

  // Combined All Transactions
  const allCombinedTransactions = useMemo(() => {
    const sessionTxs = (sessions || [])
      .filter(s => s.status === 'Đã học' || s.status === 'Đã dạy' || s.status === 'Đã làm')
      .map(s => ({
        id: `session-${s.id}`,
        desc: `${s.student_name || s.job_name || 'Ca dạy'} - ${s.teacher_name || 'Admin'}`,
        amount: Number(s.price) || 0,
        type: 'income',
        category: s.income_category || 'Gia Sư',
        date: s.date,
        isManual: false,
        isRecurring: false
      }));

    const cleanReceiptIds = new Set(
      receiptTransactions.map(t => String(t.id).replace('tx-receipt-', '').replace('vcb-', ''))
    );

    const filteredManual = (manualTransactions || []).filter(t => {
      const cId = String(t.id).replace('tx-receipt-', '').replace('vcb-', '');
      return !cleanReceiptIds.has(cId);
    });

    return [...filteredManual, ...receiptTransactions, ...sessionTxs].sort(
      (a, b) => (b.date || '').localeCompare(a.date || '')
    );
  }, [manualTransactions, receiptTransactions, sessions]);

  // Filtered by Selected Months & Recurring Tab
  const filteredTransactions = useMemo(() => {
    return allCombinedTransactions.filter(t => {
      if (!isTxInSelectedMonths(t, chartSelectedMonths)) return false;
      if (filterRecurring === 'co_dinh') return !!t.isRecurring;
      if (filterRecurring === 'tam_thoi') return !t.isRecurring;
      return true;
    });
  }, [allCombinedTransactions, chartSelectedMonths, filterRecurring]);

  // Incomes & Expenses Slices for Donuts & Totals
  const { totalIncome, totalExpense, netValue, incomeChange, expenseChange, netChange, incomeSlices, expenseSlices, totalPieInc, totalPieExp } = useMemo(() => {
    const incMap: Record<string, number> = {};
    const expMap: Record<string, number> = {};
    let incSum = 0;
    let expSum = 0;

    allCombinedTransactions.forEach(t => {
      if (t.type === 'exchange') return;
      const tYear = (t.date || '').substring(0, 4);
      const isMatch = distMode === 'avg_year'
        ? tYear === String(distYear)
        : isTxInSelectedMonths(t, chartSelectedMonths);

      if (!isMatch) return;

      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        incMap[t.category] = (incMap[t.category] || 0) + amt;
        incSum += amt;
      } else if (t.type === 'expense') {
        expMap[t.category] = (expMap[t.category] || 0) + amt;
        expSum += amt;
      }
    });

    const divisor = distMode === 'avg_year' ? 12 : 1;
    const pieInc = incSum / divisor;
    const pieExp = expSum / divisor;

    const buildSlices = (map: Record<string, number>, total: number, isInc: boolean): PieSlice[] => {
      if (total <= 0) return [];
      let offset = 0;
      const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
      const circumference = 2 * Math.PI * 50;

      return entries.map(([name, val], idx) => {
        const adjustedVal = val / divisor;
        const pct = Math.round((adjustedVal / total) * 100);
        const dashLen = (pct / 100) * circumference;
        const dashArray = `${dashLen} ${circumference - dashLen}`;
        const dashOffset = -offset;
        offset += dashLen;
        const color = getCategoryPaletteColor(name, idx, isInc ? 'income' : 'expense');
        return { name, value: adjustedVal, color, pct, dashArray, dashOffset };
      });
    };

    return {
      totalIncome: incSum,
      totalExpense: expSum,
      netValue: incSum - expSum,
      incomeChange: 0,
      expenseChange: 0,
      netChange: 0,
      incomeSlices: buildSlices(incMap, pieInc, true),
      expenseSlices: buildSlices(expMap, pieExp, false),
      totalPieInc: pieInc,
      totalPieExp: pieExp,
    };
  }, [allCombinedTransactions, chartSelectedMonths, distMode, distYear]);

  const projectedIncome = useMemo(() => {
    const totalCategoryTargets = incomeCats.reduce((sum, cat) => sum + (Number(categoryBudgets[cat.name]) || 0), 0);
    const monthsMultiplier = Math.max(1, chartSelectedMonths.length);
    return totalCategoryTargets * monthsMultiplier;
  }, [incomeCats, categoryBudgets, chartSelectedMonths]);

  const getCategoryActual = (catName: string, isExpense: boolean) => {
    if (getActualCategoryAmount) {
      return getActualCategoryAmount(catName) || 0;
    }
    return 0;
  };

  // Handlers
  const handleCreateCategory = (data: {
    name: string;
    type: 'income' | 'expense';
    budget: number;
    keywords: string;
    icon: string;
    note: string;
  }) => {
    const isInc = data.type === 'income';
    const newCat = {
      name: data.name,
      icon: data.icon || (isInc ? 'TrendingUp' : 'Coins'),
      note: data.note,
      keywords: data.keywords,
    };

    const nextIncomes = isInc ? [...incomeCats, newCat] : incomeCats;
    const nextExpenses = !isInc ? [...expenseCats, newCat] : expenseCats;
    const nextBudgets = { ...categoryBudgets, [data.name]: data.budget };
    const nextTypes = { ...categoryTypes, [data.name]: data.type };
    const nextIcons = { ...categoryIcons, [data.name]: newCat.icon };
    const nextNotes = { ...categoryNotes, [data.name]: newCat.note };
    const nextKeywords = { ...categoryKeywords, [data.name]: newCat.keywords };

    if (isInc) setIncomeCats(nextIncomes);
    else setExpenseCats(nextExpenses);

    saveBudgets(currentUser.id, nextBudgets, nextKeywords, nextTypes, nextIcons, nextNotes);
  };

  const handleSaveCategoryEdit = (cat: any) => {
    const isInc = cat.type === 'income';
    const list = isInc ? [...incomeCats] : [...expenseCats];
    const oldName = list[cat.index]?.name;
    list[cat.index] = {
      name: cat.name,
      icon: cat.icon || (isInc ? 'TrendingUp' : 'Coins'),
      note: cat.note,
      keywords: cat.keywords,
    };

    const nextBudgets = { ...categoryBudgets };
    if (oldName && oldName !== cat.name) {
      delete nextBudgets[oldName];
    }
    nextBudgets[cat.name] = Number(cat.budget) || 0;

    const nextTypes = { ...categoryTypes, [cat.name]: cat.type };
    const nextIcons = { ...categoryIcons, [cat.name]: list[cat.index].icon };
    const nextNotes = { ...categoryNotes, [cat.name]: list[cat.index].note };
    const nextKeywords = { ...categoryKeywords, [cat.name]: list[cat.index].keywords };

    if (isInc) setIncomeCats(list);
    else setExpenseCats(list);

    saveBudgets(currentUser.id, nextBudgets, nextKeywords, nextTypes, nextIcons, nextNotes);
  };

  const handleDeleteCategoryConfirmed = () => {
    if (!confirmDeleteCat) return;
    const { type, index, name } = confirmDeleteCat;
    const isInc = type === 'income';
    const list = (isInc ? incomeCats : expenseCats).filter((_, idx) => idx !== index);

    const nextBudgets = { ...categoryBudgets };
    delete nextBudgets[name];

    const nextTypes = { ...categoryTypes };
    delete nextTypes[name];

    const nextIcons = { ...categoryIcons };
    delete nextIcons[name];

    const nextNotes = { ...categoryNotes };
    delete nextNotes[name];

    const nextKeywords = { ...categoryKeywords };
    delete nextKeywords[name];

    if (isInc) setIncomeCats(list);
    else setExpenseCats(list);

    saveBudgets(currentUser.id, nextBudgets, nextKeywords, nextTypes, nextIcons, nextNotes);
    setConfirmDeleteCat(null);
    setEditingCat(null);
  };

  const handleMoveCategory = (type: 'income' | 'expense', fromIdx: number, direction: 'up' | 'down') => {
    const isInc = type === 'income';
    const list = isInc ? [...incomeCats] : [...expenseCats];
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= list.length) return;

    const temp = list[fromIdx];
    list[fromIdx] = list[toIdx];
    list[toIdx] = temp;

    if (isInc) setIncomeCats(list);
    else setExpenseCats(list);
  };

  const handleReorderCategory = (type: 'income' | 'expense', fromIdx: number, toIdx: number) => {
    const isInc = type === 'income';
    const list = isInc ? [...incomeCats] : [...expenseCats];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    if (isInc) setIncomeCats(list);
    else setExpenseCats(list);
  };

  const handleSaveTxEdit = (updatedTx: any) => {
    if (!saveTransactions || !updatedTx) return;
    const nextList = (manualTransactions || []).map(t => (t.id === updatedTx.id ? updatedTx : t));
    saveTransactions(currentUser.id, nextList);
  };

  return (
    <div className="space-y-6 animate-mac-dropdown">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4 select-none">
        <div className="flex flex-col text-left">
          <h2 className="text-2xl font-black text-white text-glow-white tracking-tight">Sổ Nhật Ký Dòng Tiền</h2>
          <p className="text-slate-400 text-xs font-semibold mt-0.5">Theo dõi doanh thu, chi phí, lập ngân sách thu chi theo danh mục & thặng dư</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <MonthPickerDropdown
            chartSelectedMonths={chartSelectedMonths}
            toggleChartMonth={toggleChartMonth}
          />

          <button
            type="button"
            onClick={() => handleOpenTxModal('expense')}
            className="flex items-center gap-2 px-4 py-2 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all hover:scale-[1.02] shadow-[0_0_12px_rgba(92,54,245,0.45)] hover:shadow-[0_0_18px_rgba(92,54,245,0.65)]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Thêm Giao Dịch</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <FlowSummaryCards
        projectedIncome={projectedIncome}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        netValue={netValue}
        incomeChange={incomeChange}
        expenseChange={expenseChange}
        netChange={netChange}
      />

      {/* Donut and Pie Charts */}
      <FlowDonutCharts
        distMode={distMode}
        setDistMode={setDistMode}
        distYear={distYear}
        setDistYear={setDistYear}
        totalPieInc={totalPieInc}
        totalPieExp={totalPieExp}
        incomeSlices={incomeSlices}
        expenseSlices={expenseSlices}
      />

      {/* Category Budgets Grid & Trang Account Card */}
      <FlowCategoryGrid
        currentUser={currentUser}
        incomeCats={incomeCats}
        expenseCats={expenseCats}
        categoryBudgets={categoryBudgets}
        chartSelectedMonths={chartSelectedMonths}
        getCategoryActual={getCategoryActual}
        getCategoryIconName={getCategoryIconName}
        onAddCategory={(type) => setAddingCatType(type)}
        onEditCategory={(cat) => setEditingCat(cat)}
        onReorderCategory={handleReorderCategory}
        onMoveCategory={handleMoveCategory}
        trangAccountBalance={trangAccountBalance}
        bankReceipts={bankReceipts}
        manualTransactions={manualTransactions}
        onEditTrangBalance={() => setIsTrangModalOpen(true)}
      />

      {/* Transactions & Bank Receipts Section */}
      <FlowTransactionsSection
        currentUser={currentUser}
        filterRecurring={filterRecurring}
        setFilterRecurring={setFilterRecurring}
        filteredTransactions={filteredTransactions}
        filteredBankReceipts={filteredBankReceipts}
        bankReceiptsCount={(bankReceipts || []).length}
        isSyncing={isSyncing}
        handleSyncReceipts={async () => {
          if (handleSyncReceipts) {
            setIsSyncing(true);
            await handleSyncReceipts();
            setIsSyncing(false);
          }
        }}
        handleUnclassifyReceipt={handleUnclassifyReceipt}
        onOpenClassify={(r) => setClassifyingReceipt(r)}
        onEditTransaction={(tx) => setEditingTx(tx)}
        getCategoryIconName={getCategoryIconName}
      />

      {/* Modals */}
      <AddCategoryModal
        isOpen={!!addingCatType}
        type={addingCatType}
        onClose={() => setAddingCatType(null)}
        onSubmit={handleCreateCategory}
      />

      <EditCategoryModal
        isOpen={!!editingCat}
        category={editingCat}
        onClose={() => setEditingCat(null)}
        onSave={handleSaveCategoryEdit}
        onDelete={(type, index, name) => setConfirmDeleteCat({ type, index, name })}
      />

      <EditTransactionModal
        isOpen={!!editingTx}
        tx={editingTx}
        onClose={() => setEditingTx(null)}
        incomeCats={incomeCats}
        expenseCats={expenseCats}
        onSave={handleSaveTxEdit}
        onDelete={handleDeleteManualTx}
      />

      <ReceiptClassifyModal
        isOpen={!!classifyingReceipt}
        receipt={classifyingReceipt}
        onClose={() => setClassifyingReceipt(null)}
        incomeCats={incomeCats}
        expenseCats={expenseCats}
        onClassify={handleClassifyReceipt || (async () => {})}
        onUnclassify={handleUnclassifyReceipt}
      />

      <TrangBalanceModal
        isOpen={isTrangModalOpen}
        initialBalance={trangAccountBalance}
        onClose={() => setIsTrangModalOpen(false)}
        onSave={saveTrangAccountBalance}
      />

      {confirmDeleteCat && (
        <ConfirmModal
          isOpen={true}
          title="Xác nhận xóa danh mục"
          message={`Bạn có chắc chắn muốn xóa danh mục "${confirmDeleteCat.name}" không? Hạn mức và các thống kê liên quan sẽ bị loại bỏ.`}
          confirmLabel="Xóa danh mục"
          variant="danger"
          onConfirm={handleDeleteCategoryConfirmed}
          onClose={() => setConfirmDeleteCat(null)}
        />
      )}
    </div>
  );
};

export default FlowTab;

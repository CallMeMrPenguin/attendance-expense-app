import React from 'react';
import { 
  Plus, 
  Trash2,
  DollarSign,
  Edit2,
  Briefcase,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Coins,
  HelpCircle,
  Utensils,
  Car,
  ShoppingBag,
  Receipt,
  Film,
  MoreHorizontal,
  Home,
  Heart,
  Plane,
  Gift,
  Phone,
  Shield,
  Cpu,
  Coffee,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  X
} from 'lucide-react';
import { formatVND, Session, formatDateVN } from '@/lib/utils';
import CustomDatePicker from './CustomDatePicker';

const ICON_COMPONENTS: Record<string, React.ComponentType<any>> = {
  Briefcase, GraduationCap, TrendingUp, Coins, HelpCircle,
  Utensils, Car, ShoppingBag, Receipt, Film, MoreHorizontal,
  Home, Heart, Plane, Gift, Phone, Shield, Cpu, Coffee
};

const CategoryIcon = ({ iconName, className }: { iconName: string, className?: string }) => {
  const IconComp = ICON_COMPONENTS[iconName] || HelpCircle;
  return <IconComp className={className} />;
};

interface FlowTabProps {
  currentUser: {
    id: string;
  };
  manualTransactions: any[];
  sessions: Session[];
  categoryBudgets: Record<string, number>;
  chartSelectedMonths: string[];
  getActualCategoryAmount: (cat: string) => number;
  handleDeleteManualTx: (id: string) => void;
  handleOpenTxModal: (type: 'income' | 'expense' | 'saving') => void;
  saveBudgets: (userId: string, budgets: Record<string, number>) => void;
  saveTransactions?: (userId: string, data: any[]) => void;
  toggleChartMonth?: (mStr: string) => void;
}

export const formatAbbreviatedVND = (value: number): string => {
  if (value === 0) return '0';
  const isNegative = value < 0;
  const absVal = Math.abs(value);
  
  let result = '';
  if (absVal >= 1000000) {
    const mil = Math.floor(absVal / 1000000);
    const rem = absVal % 1000000;
    if (rem === 0) {
      result = `${mil}M`;
    } else {
      const cents = Math.round(rem / 10000);
      if (cents === 0) {
        result = `${mil}M`;
      } else {
        const centsStr = cents < 10 ? `0${cents}` : `${cents}`;
        const trimmedCents = centsStr.replace(/0+$/, '');
        result = `${mil}M${trimmedCents}`;
      }
    }
  } else if (absVal >= 1000) {
    const k = Math.floor(absVal / 1000);
    const rem = absVal % 1000;
    if (rem === 0) {
      result = `${k}K`;
    } else {
      const cents = Math.round(rem / 10);
      if (cents === 0) {
        result = `${k}K`;
      } else {
        const centsStr = cents < 10 ? `0${cents}` : `${cents}`;
        const trimmedCents = centsStr.replace(/0+$/, '');
        result = `${k}K${trimmedCents}`;
      }
    }
  } else {
    result = `${absVal}`;
  }
  
  return isNegative ? `-${result}` : result;
};

export default function FlowTab({
  currentUser,
  manualTransactions,
  sessions,
  categoryBudgets,
  chartSelectedMonths,
  getActualCategoryAmount,
  handleDeleteManualTx,
  handleOpenTxModal,
  saveBudgets,
  saveTransactions,
  toggleChartMonth
}: FlowTabProps) {

  // Dynamic custom categories lists
  const [incomeCats, setIncomeCats] = React.useState<{name: string, icon: string}[]>([
    { name: 'Lương', icon: 'Briefcase' },
    { name: 'Giáo dục', icon: 'GraduationCap' },
    { name: 'Đầu tư', icon: 'TrendingUp' },
    { name: 'Khác', icon: 'Coins' }
  ]);
  const [expenseCats, setExpenseCats] = React.useState<{name: string, icon: string}[]>([
    { name: 'Ăn uống', icon: 'Utensils' },
    { name: 'Di chuyển', icon: 'Car' },
    { name: 'Shopping', icon: 'ShoppingBag' },
    { name: 'Hóa đơn', icon: 'Receipt' },
    { name: 'Giải trí', icon: 'Film' },
    { name: 'Khác', icon: 'MoreHorizontal' }
  ]);

  // Month Selector States
  const [monthPickerOpen, setMonthPickerOpen] = React.useState(false);
  const [pickerYear, setPickerYear] = React.useState(() => {
    const firstMonth = chartSelectedMonths[0] || '';
    return firstMonth ? parseInt(firstMonth.split('-')[0]) : new Date().getFullYear();
  });

  // Load categories from localStorage or set defaults
  React.useEffect(() => {
    if (currentUser?.id) {
      const savedIncome = localStorage.getItem(`finance_income_cats_${currentUser.id}`);
      const savedExpense = localStorage.getItem(`finance_expense_cats_${currentUser.id}`);
      if (savedIncome) {
        setIncomeCats(JSON.parse(savedIncome));
      } else {
        localStorage.setItem(`finance_income_cats_${currentUser.id}`, JSON.stringify(incomeCats));
      }
      if (savedExpense) {
        setExpenseCats(JSON.parse(savedExpense));
      } else {
        localStorage.setItem(`finance_expense_cats_${currentUser.id}`, JSON.stringify(expenseCats));
      }
    }
  }, [currentUser]);

  // Edit category state (contains budget now)
  const [editingCat, setEditingCat] = React.useState<{
    type: 'income' | 'expense';
    index: number;
    name: string;
    icon: string;
    budget: number;
  } | null>(null);

  // Edit manual transaction state
  const [editingTx, setEditingTx] = React.useState<{
    id: string;
    desc: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
  } | null>(null);

  // Filter & Pagination states for Giao dịch section
  const [filterType, setFilterType] = React.useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const itemsPerPage = 10;

  // Filter Popover Menu toggles
  const [typeFilterOpen, setTypeFilterOpen] = React.useState(false);
  const [catFilterOpen, setCatFilterOpen] = React.useState(false);

  // Close menus on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-picker]')) {
        setMonthPickerOpen(false);
      }
      if (!target.closest('[data-filter-type]')) {
        setTypeFilterOpen(false);
      }
      if (!target.closest('[data-filter-cat]')) {
        setCatFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic calculations for category actuals to adapt to renamed category names
  const getCategoryActual = (catName: string, isExpense: boolean) => {
    if (isExpense) {
      return manualTransactions
        .filter(t => t.type === 'expense' && t.category === catName && chartSelectedMonths.includes(t.date.substring(0, 7)))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    } else {
      const manualInc = manualTransactions
        .filter(t => t.type === 'income' && t.category === catName && chartSelectedMonths.includes(t.date.substring(0, 7)))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      let autoInc = 0;
      const eduCatName = incomeCats[1]?.name || 'Giáo dục';
      if (catName === eduCatName) {
        autoInc = sessions
          .filter(s => s.status === 'Đã dạy' && chartSelectedMonths.includes(s.month_year))
          .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
      }
      return manualInc + autoInc;
    }
  };

  const getCategoryIconName = (catName: string, type: 'income' | 'expense') => {
    const list = type === 'income' ? incomeCats : expenseCats;
    const found = list.find(c => c.name === catName);
    return found ? found.icon : 'HelpCircle';
  };

  const handleSaveCategoryEdit = () => {
    if (!editingCat || !editingCat.name.trim()) return;
    const { type, index, name: newName, icon: newIcon, budget } = editingCat;
    
    const list = type === 'income' ? incomeCats : expenseCats;
    const oldName = list[index].name;

    // 1. Update list
    const updatedList = list.map((item, idx) => 
      idx === index ? { name: newName.trim(), icon: newIcon } : item
    );

    if (type === 'income') {
      setIncomeCats(updatedList);
      localStorage.setItem(`finance_income_cats_${currentUser.id}`, JSON.stringify(updatedList));
    } else {
      setExpenseCats(updatedList);
      localStorage.setItem(`finance_expense_cats_${currentUser.id}`, JSON.stringify(updatedList));
    }

    // 2. Transfer and update budget
    const updatedBudgets = { ...categoryBudgets };
    if (oldName !== newName.trim()) {
      delete updatedBudgets[oldName];
    }
    updatedBudgets[newName.trim()] = Number(budget);
    saveBudgets(currentUser.id, updatedBudgets);

    // 3. Update transaction items
    if (oldName !== newName.trim() && saveTransactions) {
      const updatedTx = manualTransactions.map(tx => {
        if (tx.category === oldName) {
          return { ...tx, category: newName.trim() };
        }
        return tx;
      });
      saveTransactions(currentUser.id, updatedTx);
    }

    setEditingCat(null);
    alert('Đã cập nhật danh mục thành công!');
  };

  const handleSaveTxEdit = () => {
    if (!editingTx || !editingTx.desc.trim() || Number(editingTx.amount) <= 0) {
      alert('Mô tả và số tiền không được để trống.');
      return;
    }
    if (saveTransactions) {
      const updated = manualTransactions.map(tx => {
        if (tx.id === editingTx.id) {
          return {
            ...tx,
            desc: editingTx.desc.trim(),
            amount: Number(editingTx.amount),
            type: editingTx.type,
            category: editingTx.category,
            date: editingTx.date
          };
        }
        return tx;
      });
      saveTransactions(currentUser.id, updated);
      setEditingTx(null);
      alert('Đã sửa giao dịch thành công!');
    }
  };

  // Sync compute local transactions lists
  const getIncomeTransactions = () => {
    const manual = manualTransactions
      .filter(t => t.type === 'income')
      .map(t => ({
        id: t.id,
        desc: t.desc,
        amount: Number(t.amount) || 0,
        category: t.category,
        date: t.date,
        isManual: true
      }));

    const auto = sessions
      .filter(s => s.status === 'Đã dạy')
      .map(s => ({
        id: `session-${s.id}`,
        desc: `Thu nhập ca dạy: ${s.student_name}`,
        amount: Number(s.price) || 0,
        category: 'Giáo dục',
        date: s.date,
        isManual: false
      }));

    return [...manual, ...auto]
      .filter(t => chartSelectedMonths.includes(t.date.substring(0, 7)))
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const getExpenseTransactions = () => {
    return manualTransactions
      .filter(t => t.type === 'expense' && chartSelectedMonths.includes(t.date.substring(0, 7)))
      .map(t => ({
        id: t.id,
        desc: t.desc,
        amount: Number(t.amount) || 0,
        category: t.category,
        date: t.date,
        isManual: true
      }));
  };

  const incomes = getIncomeTransactions().map(t => ({ ...t, type: 'income' as const }));
  const expenses = getExpenseTransactions().map(t => ({ ...t, type: 'expense' as const }));
  const transactions = [...incomes, ...expenses].sort((a, b) => b.date.localeCompare(a.date));

  // Filtered & Paginated Transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchesSearch = t.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const netValue = totalIncome - totalExpense;

  // Month-over-Month Comparisons
  const getPreviousMonthStr = (monthStr: string) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-').map(Number);
    if (m === 1) return `${y - 1}-12`;
    return `${y}-${String(m - 1).padStart(2, '0')}`;
  };

  const prevMonths = chartSelectedMonths.map(getPreviousMonthStr).filter(Boolean);

  const prevIncome = manualTransactions
    .filter(t => t.type === 'income' && prevMonths.includes(t.date.substring(0, 7)))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) +
    sessions
      .filter(s => s.status === 'Đã dạy' && prevMonths.includes(s.month_year))
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  const prevExpense = manualTransactions
    .filter(t => t.type === 'expense' && prevMonths.includes(t.date.substring(0, 7)))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const prevNet = prevIncome - prevExpense;

  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const incomeChange = getChangePercent(totalIncome, prevIncome);
  const expenseChange = getChangePercent(totalExpense, prevExpense);
  const netChange = getChangePercent(netValue, prevNet);

  const renderCategoryTable = (type: 'income' | 'expense') => {
    const list = type === 'income' ? incomeCats : expenseCats;
    const isIncome = type === 'income';

    return (
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-[11px] font-bold text-slate-350 min-w-[550px]">
          <thead>
            <tr className="border-b border-white/5 text-[11px] font-black uppercase text-slate-500 tracking-wider">
              <th className="py-2.5 text-left pl-5 w-[20%]">Danh mục</th>
              <th className="py-2.5 text-right w-[20%]">Thực tế</th>
              <th className="py-2.5 text-right w-[20%]">{isIncome ? 'Mục tiêu' : 'Hạn mức'}</th>
              <th className="py-2.5 text-center w-[20%] px-4">Tiến độ</th>
              <th className="py-2.5 text-center w-[20%]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((catItem, idx) => {
              const cat = catItem.name;
              const iconName = catItem.icon;
              const actual = getCategoryActual(cat, !isIncome);
              const budgetVal = categoryBudgets[cat] || 0;
              const rawPct = budgetVal > 0 ? Math.round((actual / budgetVal) * 100) : 0;
              const pct = Math.min(100, rawPct);
              const isAchieved = isIncome && budgetVal > 0 && rawPct >= 100;
              const isOver = !isIncome && budgetVal > 0 && rawPct >= 100;

              let barColorClass = '';
              if (isIncome) {
                if (rawPct <= 40) {
                  barColorClass = 'bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]';
                } else if (rawPct <= 90) {
                  barColorClass = 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.7)]';
                } else {
                  barColorClass = 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]';
                }
              } else {
                if (rawPct <= 40) {
                  barColorClass = 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.7)]';
                } else if (rawPct <= 90) {
                  barColorClass = 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.7)]';
                } else {
                  barColorClass = 'bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]';
                }
              }

              const rowClass = isOver 
                ? 'highlight-expense-row bg-rose-500/[0.035] hover:bg-rose-500/[0.07] transition-colors group'
                : isAchieved
                  ? 'highlight-income-row bg-emerald-500/[0.035] hover:bg-emerald-500/[0.07] transition-colors group'
                  : 'hover:bg-[#1c2438] transition-colors group';

              return (
                <tr key={cat} className={rowClass}>
                  <td className="py-3 text-left pl-5">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex p-1.5 rounded-lg border transition-all duration-300 ${
                        isIncome 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.45)]' 
                          : 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.45)]'
                      }`}>
                        <CategoryIcon iconName={iconName} className="h-3.5 w-3.5" />
                      </span>
                      <span className={`font-bold text-xs ${isIncome ? 'text-emerald-400 text-glow-green' : 'text-red-500 text-glow-red'}`}>{cat}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right text-slate-200">
                    {formatVND(actual)}
                  </td>
                  <td className="py-3 text-right text-slate-400">
                    {formatVND(budgetVal)}
                  </td>
                  <td className="py-3 text-center px-4">
                    <div className="space-y-1">
                      <div className="h-1.5 bg-[#101420] rounded-full w-full relative">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[8px] font-extrabold text-slate-400">
                        <span>{pct}%</span>
                        {rawPct > 100 && (
                          <span className={`${isIncome ? 'text-emerald-400' : 'text-rose-500'} font-black uppercase`}>Vượt!</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <button
                      onClick={() => setEditingCat({ 
                        type, 
                        index: idx, 
                        name: cat, 
                        icon: iconName, 
                        budget: budgetVal 
                      })}
                      className="p-1 hover:bg-white/5 text-slate-400 hover:text-indigo-400 rounded transition-all cursor-pointer inline-flex"
                      title="Chỉnh sửa danh mục"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-mac-dropdown text-left">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-white text-glow-white tracking-tight">Sổ Nhật Ký Dòng Tiền</h2>
          <p className="text-slate-400 text-xs font-semibold">Liệt kê tất cả các khoản chi tiêu và nguồn thu nhập thực tế trong bộ lọc tháng.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Month picker using schedule view style */}
          <div className="relative" data-picker>
            <button
              onClick={() => {
                setMonthPickerOpen(o => !o);
                const firstMonth = chartSelectedMonths[0] || '';
                if (firstMonth) setPickerYear(parseInt(firstMonth.split('-')[0]));
              }}
              className="flex items-center gap-2 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-white text-[11px] font-bold rounded-xl px-3.5 py-1.5 cursor-pointer transition-all shadow-lg"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span className="font-black">
                {chartSelectedMonths.length === 1 
                  ? (() => {
                      const [y, m] = chartSelectedMonths[0].split('-');
                      return `${['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'][parseInt(m)-1]} ${y}`;
                    })()
                  : `${chartSelectedMonths.length} tháng đã chọn`
                }
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${monthPickerOpen ? 'rotate-180' : ''}`} />
            </button>
            {monthPickerOpen && (
              <div className="absolute top-full mt-2 right-0 z-[200] w-64 bg-[#0d1018] border border-white/10 rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-4 backdrop-blur-xl animate-mac-dropdown origin-top-right">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setPickerYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-sm font-black text-white">{pickerYear}</span>
                  <button onClick={() => setPickerYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Th.1','Th.2','Th.3','Th.4','Th.5','Th.6','Th.7','Th.8','Th.9','Th.10','Th.11','Th.12'].map((mn, i) => {
                    const val = `${pickerYear}-${String(i + 1).padStart(2, '0')}`;
                    const isActive = chartSelectedMonths.includes(val);
                    
                    const currentDate = new Date();
                    const curY = currentDate.getFullYear();
                    const curM = currentDate.getMonth() + 1;
                    const isFuture = pickerYear > curY || (pickerYear === curY && (i + 1) > curM);

                    return (
                      <button
                        key={mn}
                        disabled={isFuture}
                        onClick={() => toggleChartMonth?.(val)}
                        className={`py-1.5 text-xs font-bold rounded-xl transition-all ${
                          isFuture
                            ? 'text-slate-700 bg-transparent cursor-not-allowed opacity-30'
                            : isActive
                              ? 'bg-[#5c36f5] text-white shadow-[0_0_12px_rgba(92,54,245,0.5)] cursor-pointer'
                              : 'text-slate-400 hover:bg-white/[0.06] hover:text-white cursor-pointer'
                        }`}
                      >
                        {mn}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => handleOpenTxModal('expense')}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-[11px] rounded-xl cursor-pointer transition-all hover:scale-[1.02] shadow-[0_0_12px_rgba(92,54,245,0.45)] hover:shadow-[0_0_18px_rgba(92,54,245,0.65)]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Thêm Giao Dịch</span>
          </button>
        </div>
      </div>

      {/* Overall Value Cards (Glow UI - Specialized colors) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Income overall card */}
        <div className="kpi-card-green p-6 flex flex-col justify-between min-h-[120px] text-left">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] font-black text-emerald-400 text-glow-green uppercase tracking-widest block">Tổng Thu Nhập</span>
              <span className="text-xl font-black text-emerald-400 text-glow-green tracking-tight block">{formatVND(totalIncome)}</span>
              {/* MoM Comparison */}
              <div className="flex items-center gap-1 select-none">
                <span className={`text-[9px] font-black ${
                  incomeChange > 0 ? 'text-emerald-400' : incomeChange < 0 ? 'text-rose-500' : 'text-amber-500'
                }`}>
                  {incomeChange > 0 ? `↑ +${incomeChange}%` : incomeChange < 0 ? `↓ ${incomeChange}%` : '0%'} so với tháng trước
                </span>
              </div>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl shadow-[0_0_12px_rgba(16,185,129,0.35)] shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Expense overall card */}
        <div className="kpi-card-red p-6 flex flex-col justify-between min-h-[120px] text-left">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] font-black text-rose-500 text-glow-red uppercase tracking-widest block">Tổng Chi Tiêu</span>
              <span className="text-xl font-black text-rose-500 text-glow-red tracking-tight block">{formatVND(totalExpense)}</span>
              {/* MoM Comparison */}
              <div className="flex items-center gap-1 select-none">
                <span className={`text-[9px] font-black ${
                  expenseChange > 0 ? 'text-rose-500' : expenseChange < 0 ? 'text-emerald-400' : 'text-amber-500'
                }`}>
                  {expenseChange > 0 ? `↑ +${expenseChange}%` : expenseChange < 0 ? `↓ ${expenseChange}%` : '0%'} so với tháng trước
                </span>
              </div>
            </div>
            <div className="p-2 bg-rose-500/10 text-rose-500 border border-rose-500/30 rounded-xl shadow-[0_0_12px_rgba(239,68,68,0.35)] shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Net overall card */}
        <div className="kpi-card-blue p-6 flex flex-col justify-between min-h-[120px] text-left">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] font-black text-blue-400 text-glow-blue uppercase tracking-widest block">Tổng Thặng Dư</span>
              <span className="text-xl font-black text-blue-400 text-glow-blue tracking-tight block">{formatVND(netValue)}</span>
              {/* MoM Comparison */}
              <div className="flex items-center gap-1 select-none">
                <span className={`text-[9px] font-black ${
                  netChange > 0 ? 'text-emerald-400' : netChange < 0 ? 'text-rose-500' : 'text-amber-500'
                }`}>
                  {netChange > 0 ? `↑ +${netChange}%` : netChange < 0 ? `↓ ${netChange}%` : '0%'} so với tháng trước
                </span>
              </div>
            </div>
            <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl shadow-[0_0_12px_rgba(59,130,246,0.35)] shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Category Tables split into 2 sections (Calendar container depth styles) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Income budget block */}
        <div className="calendar-container-depth p-5 bg-[#141824] space-y-4">
          <div className="flex flex-col items-center justify-center border-b border-white/5 pb-3">
            <div className="flex items-center justify-center gap-2">
              <div className="p-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg shadow-[0_0_8px_rgba(16,185,129,0.35)] shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="text-[15px] font-black text-emerald-400 text-glow-green uppercase tracking-wider">Loại thu nhập</h3>
            </div>
          </div>
          {renderCategoryTable('income')}
        </div>

        {/* Expense budget block */}
        <div className="calendar-container-depth p-5 bg-[#141824] space-y-4">
          <div className="flex flex-col items-center justify-center border-b border-white/5 pb-3">
            <div className="flex items-center justify-center gap-2">
              <div className="p-1 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg shadow-[0_0_8px_rgba(239,68,68,0.35)] shrink-0">
                <TrendingDown className="h-4 w-4" />
              </div>
              <h3 className="text-[15px] font-black text-red-500 text-glow-red uppercase tracking-wider">Loại chi tiêu</h3>
            </div>
          </div>
          {renderCategoryTable('expense')}
        </div>

      </div>

      {/* Unified Transaction List with search, filtering and pagination */}
      <div className="calendar-container-depth p-5 bg-[#141824] space-y-4">
        <div className="flex flex-col items-center justify-center border-b border-white/5 pb-3">
          <div className="flex items-center justify-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg shadow-[0_0_10px_rgba(99,102,241,0.55)]">
              <DollarSign className="h-4 w-4" />
            </div>
            <h3 className="text-[15px] font-black text-indigo-400 text-glow-blue uppercase tracking-wider">Giao dịch</h3>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full table-fixed text-[13px] font-bold text-slate-350">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-2.5 text-center font-black w-[20%] relative pl-5" data-filter-type>
                  <span className="inline-flex items-center gap-1.5 justify-center">
                    <span>Loại</span>
                    <Filter 
                      className={`h-3 w-3 cursor-pointer transition-colors ${filterType !== 'all' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-350'}`}
                      onClick={() => setTypeFilterOpen(o => !o)}
                    />
                  </span>
                  {typeFilterOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-40 bg-[#0d1018]/95 border border-white/10 rounded-[14px] p-1.5 shadow-2xl text-left font-normal normal-case w-24 animate-mac-dropdown origin-top">
                      {(['all', 'income', 'expense'] as const).map(option => (
                        <button
                          key={option}
                          onClick={() => { setFilterType(option); setTypeFilterOpen(false); setCurrentPage(1); }}
                          className={`w-full text-left px-2 py-1 text-[9px] font-bold rounded-lg ${
                            filterType === option ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:bg-white/5'
                          }`}
                        >
                          {option === 'all' ? 'Tất cả' : option === 'income' ? 'Thu nhập' : 'Chi tiêu'}
                        </button>
                      ))}
                    </div>
                  )}
                </th>
                <th className="py-2.5 text-left font-black w-[20%]">
                  <span className="inline-flex items-center gap-1.5">
                    <span>Chi tiết giao dịch</span>
                    <input
                      type="text"
                      placeholder="Tìm..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="ml-2 bg-[#0d1018] border border-white/10 rounded-lg px-2 py-0.5 text-[8.5px] font-medium text-white focus:outline-none focus:border-indigo-500/50 w-24 normal-case placeholder-slate-600"
                    />
                  </span>
                </th>
                <th className="py-2.5 text-left font-black w-[20%] relative" data-filter-cat>
                  <span className="inline-flex items-center gap-1.5">
                    <span>Danh mục</span>
                    <Filter 
                      className={`h-3 w-3 cursor-pointer transition-colors ${filterCategory !== 'all' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-350'}`}
                      onClick={() => setCatFilterOpen(o => !o)}
                    />
                  </span>
                  {catFilterOpen && (
                    <div className="absolute top-full left-0 mt-1.5 z-40 bg-[#0d1018]/95 border border-white/10 rounded-[14px] p-1.5 shadow-2xl text-left font-normal normal-case w-36 max-h-48 overflow-y-auto scrollbar-thin animate-mac-dropdown origin-top">
                      <button
                        onClick={() => { setFilterCategory('all'); setCatFilterOpen(false); setCurrentPage(1); }}
                        className={`w-full text-left px-2 py-1.5 text-[9px] font-bold rounded-lg ${
                          filterCategory === 'all' ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        Tất cả
                      </button>
                      {Array.from(new Set(transactions.map(t => t.category))).map(catName => (
                        <button
                          key={catName}
                          onClick={() => { setFilterCategory(catName); setCatFilterOpen(false); setCurrentPage(1); }}
                          className={`w-full text-left px-2 py-1.5 text-[9px] font-bold rounded-lg ${
                            filterCategory === catName ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:bg-white/5'
                          }`}
                        >
                          {catName}
                        </button>
                      ))}
                    </div>
                  )}
                </th>
                <th className="py-2.5 text-right font-black w-[20%]">Số tiền</th>
                <th className="py-2.5 text-center font-black w-[20%]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500 font-bold">Chưa ghi nhận giao dịch nào.</td>
                </tr>
              ) : (
                paginatedTransactions.map((t) => {
                  const isIncome = t.type === 'income';
                  const catIcon = getCategoryIconName(t.category, t.type);
                  const rowClass = isIncome 
                    ? 'highlight-income-row bg-emerald-500/[0.025] hover:bg-emerald-500/[0.055] text-emerald-450 transition-colors group' 
                    : 'highlight-expense-row bg-rose-500/[0.025] hover:bg-rose-500/[0.055] text-red-400 transition-colors group';

                  return (
                    <tr key={t.id} className={rowClass}>
                      <td className="py-3 text-center pl-5">
                        <span className={`inline-flex p-1.5 rounded-lg border ${
                          isIncome 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35 shadow-[0_0_8px_rgba(16,185,129,0.35)]' 
                            : 'bg-rose-500/15 text-rose-500 border-rose-500/35 shadow-[0_0_8px_rgba(239,68,68,0.35)]'
                        }`}>
                          <DollarSign className="h-3.5 w-3.5" />
                        </span>
                      </td>
                      <td className="py-3 text-left">
                        <p className={isIncome ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>{t.desc}</p>
                        <span className={`text-[8.5px] font-extrabold block mt-0.5 ${isIncome ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>{t.date}</span>
                      </td>
                      <td className="py-3 text-left">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex p-1.5 rounded-lg border shrink-0 ${
                            isIncome 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]' 
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                          }`}>
                            <CategoryIcon iconName={catIcon} className="h-3.5 w-3.5" />
                          </span>
                          <span className={isIncome ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{t.category}</span>
                        </div>
                      </td>
                      <td className={`py-3 text-right font-black ${
                        isIncome ? 'text-emerald-400' : 'text-rose-500'
                      }`}>
                        {isIncome ? '+' : '-'}{formatVND(t.amount)}
                      </td>
                      <td className="py-3 text-center">
                        {t.isManual ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingTx({
                                id: t.id,
                                desc: t.desc,
                                amount: t.amount,
                                type: t.type,
                                category: t.category,
                                date: t.date
                              })}
                              className={`p-1 rounded-lg transition-all cursor-pointer ${
                                isIncome 
                                  ? 'hover:bg-emerald-500/10 text-emerald-450 hover:text-emerald-300' 
                                  : 'hover:bg-red-500/10 text-red-500 hover:text-red-300'
                              }`}
                              title="Sửa giao dịch"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteManualTx(t.id)}
                              className={`p-1 rounded-lg transition-all cursor-pointer ${
                                isIncome 
                                  ? 'hover:bg-emerald-500/10 text-emerald-450 hover:text-emerald-300' 
                                  : 'hover:bg-red-500/10 text-red-500 hover:text-red-300'
                              }`}
                              title="Xóa giao dịch"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => alert('Đây là giao dịch học phí tự động liên kết với Lịch Trình ca dạy. Vui lòng chỉnh sửa giá hoặc trạng thái ca dạy trong tab Lịch Trình để cập nhật giao dịch này.')}
                              className={`p-1 rounded-lg transition-all cursor-pointer ${
                                isIncome 
                                  ? 'hover:bg-emerald-500/10 text-emerald-455 hover:text-emerald-300' 
                                  : 'hover:bg-red-500/10 text-red-500 hover:text-red-300'
                              }`}
                              title="Thông tin giao dịch tự động"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Page selection list pagination buttons */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4 pt-3 border-t border-white/5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                  currentPage === pageNum 
                    ? 'bg-indigo-500 text-white border-indigo-500/35 shadow-[0_0_12px_rgba(92,54,245,0.45)]' 
                    : 'bg-transparent border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category Edit Modal */}
      {editingCat && (
        <div className="fixed inset-0 bg-[#090b10]/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 text-slate-100">
          <div className="bg-[#0f1320] border border-indigo-500/20 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-mac-dropdown">
            <h3 className="text-sm font-black text-indigo-400 tracking-wider uppercase mb-5">
              Sửa danh mục: {editingCat.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
            </h3>

            <div className="space-y-4 text-left">
              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Tên danh mục</label>
                <input
                  type="text"
                  value={editingCat.name}
                  onChange={(e) => setEditingCat(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Budget/Limit Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">
                  {editingCat.type === 'income' ? 'Mục tiêu (đ)' : 'Hạn mức (đ)'}
                </label>
                <input
                  type="number"
                  value={editingCat.budget}
                  onChange={(e) => setEditingCat(prev => prev ? { ...prev, budget: Number(e.target.value) } : null)}
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Icon Grid Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider block">Chọn biểu tượng</label>
                <div className="grid grid-cols-6 gap-2 bg-[#090b10] p-3 rounded-xl border border-white/5 max-h-48 overflow-y-auto">
                  {Object.keys(ICON_COMPONENTS).map((iconKey) => {
                    const Icon = ICON_COMPONENTS[iconKey];
                    const isSelected = editingCat.icon === iconKey;
                    return (
                      <button
                        type="button"
                        key={iconKey}
                        onClick={() => setEditingCat(prev => prev ? { ...prev, icon: iconKey } : null)}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-[0_0_10px_rgba(92,54,245,0.3)]'
                            : 'bg-[#0d1018] border-white/5 text-slate-455 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5 mx-auto" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  className="flex-1 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategoryEdit}
                  className="flex-1 py-2.5 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(92,54,245,0.4)] transition-all hover:scale-[1.02] cursor-pointer text-center"
                >
                  Cập nhật
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Edit Modal */}
      {editingTx && (
        <div className="fixed inset-0 bg-[#090b10]/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 text-slate-100">
          <div className="bg-[#0f1320] border border-indigo-500/20 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-mac-dropdown">
            <button 
              onClick={() => setEditingTx(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-black text-indigo-400 tracking-wider uppercase mb-5">Sửa Giao Dịch</h3>

            {/* Sliding Pill Tab Switcher */}
            <div className="relative flex bg-[#090b10] border border-white/5 p-1 rounded-xl w-full mb-5">
              <div
                className={`absolute top-1 bottom-1 rounded-[10px] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none ${
                  editingTx.type === 'expense'
                    ? 'bg-rose-500 shadow-[0_0_14px_rgba(239,68,68,0.4)]'
                    : 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                }`}
                style={{
                  left: '4px',
                  width: 'calc(50% - 4px)',
                  transform: editingTx.type === 'expense' ? 'translateX(0)' : 'translateX(100%)',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setEditingTx(prev => prev ? { ...prev, type: 'expense', category: expenseCats[0]?.name || 'Ăn uống' } : null);
                }}
                className={`relative z-10 flex-1 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors duration-300 cursor-pointer ${
                  editingTx.type === 'expense' ? 'text-white' : 'text-slate-455 hover:text-slate-200'
                }`}
              >
                Chi tiêu
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingTx(prev => prev ? { ...prev, type: 'income', category: incomeCats[0]?.name || 'Lương' } : null);
                }}
                className={`relative z-10 flex-1 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors duration-300 cursor-pointer ${
                  editingTx.type === 'income' ? 'text-white' : 'text-slate-455 hover:text-slate-200'
                }`}
              >
                Thu nhập
              </button>
            </div>

            <div className="space-y-4 text-left">
              {/* Description Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Mô tả giao dịch</label>
                <input
                  type="text"
                  value={editingTx.desc}
                  onChange={(e) => setEditingTx(prev => prev ? { ...prev, desc: e.target.value } : null)}
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Số tiền (đ)</label>
                  <input
                    type="number"
                    value={editingTx.amount}
                    onChange={(e) => setEditingTx(prev => prev ? { ...prev, amount: Number(e.target.value) } : null)}
                    className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Ngày ghi nhận</label>
                  <CustomDatePicker
                    value={editingTx.date}
                    onChange={(dateStr) => setEditingTx(prev => prev ? { ...prev, date: dateStr } : null)}
                  />
                </div>
              </div>

              {/* Category dropdown selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Danh mục</label>
                <div className="relative">
                  <select
                    value={editingTx.category}
                    onChange={(e) => setEditingTx(prev => prev ? { ...prev, category: e.target.value } : null)}
                    className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer block"
                  >
                    {(editingTx.type === 'income' ? incomeCats : expenseCats).map((c) => (
                      <option key={c.name} value={c.name} className="bg-[#0d1018] text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="flex-1 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveTxEdit}
                  className="flex-1 py-2.5 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(92,54,245,0.4)] transition-all hover:scale-[1.02] cursor-pointer text-center"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

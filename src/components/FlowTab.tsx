import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import ConfirmModal from './ConfirmModal';
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
  X,
  Sparkles
} from 'lucide-react';
import { formatVND, Session, formatDateVN, formatNumberDots, parseNumberDots } from '@/lib/utils';
import CustomDatePicker from './CustomDatePicker';
import MaterialSymbol from './MaterialSymbol';

const ICON_COMPONENTS: Record<string, React.ComponentType<any>> = {
  Briefcase, GraduationCap, TrendingUp, Coins, HelpCircle,
  Utensils, Car, ShoppingBag, Receipt, Film, MoreHorizontal,
  Home, Heart, Plane, Gift, Phone, Shield, Cpu, Coffee
};

const CategoryIcon = React.memo(({ iconName, className }: { iconName: string, className?: string }) => {
  const IconComp = ICON_COMPONENTS[iconName] || HelpCircle;
  return <IconComp className={className} />;
});

interface FlowTabProps {
  currentUser: {
    id: string;
  };
  manualTransactions: any[];
  sessions: Session[];
  categoryBudgets: Record<string, number>;
  chartSelectedMonths: string[];
  bankReceipts?: any[];
  getActualCategoryAmount: (cat: string) => number;
  handleDeleteManualTx: (id: string) => void;
  handleOpenTxModal: (type: 'income' | 'expense' | 'saving') => void;
  saveBudgets: (userId: string, budgets: Record<string, number>) => void;
  saveTransactions?: (userId: string, data: any[]) => void;
  toggleChartMonth?: (mStr: string) => void;
  handleClassifyReceipt?: (receiptId: string, type: 'income' | 'expense' | 'saving', category: string, createRule: boolean, matchField: string, matchValue: string) => void | Promise<void>;
  handleSyncReceipts?: () => Promise<void>;
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

import { useToast } from '@/context/ToastContext';

function FlowTab({
  currentUser,
  manualTransactions,
  sessions,
  categoryBudgets,
  chartSelectedMonths,
  bankReceipts = [],
  getActualCategoryAmount,
  handleDeleteManualTx,
  handleOpenTxModal,
  saveBudgets,
  saveTransactions,
  toggleChartMonth,
  handleClassifyReceipt,
  handleSyncReceipts
}: FlowTabProps) {
  const { showToast } = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Bank receipt classification modal state
  const [classifyingReceipt, setClassifyingReceipt] = React.useState<any | null>(null);
  const [selectedType, setSelectedType] = React.useState<'income' | 'expense' | 'saving'>('expense');
  const [selectedCat, setSelectedCat] = React.useState<string>('Ăn uống');
  const [createRule, setCreateRule] = React.useState<boolean>(true);
  const [matchField, setMatchField] = React.useState<'remitter_name' | 'beneficiary_name' | 'details'>('remitter_name');
  const [matchValue, setMatchValue] = React.useState<string>('');
  const [isSavingClassification, setIsSavingClassification] = React.useState(false);

  // Dynamic custom categories lists
  const [incomeCats, setIncomeCats] = React.useState<{name: string, icon: string, note?: string}[]>([
    { name: 'Lương', icon: 'Briefcase', note: 'Thu nhập cố định hàng tháng' },
    { name: 'Giáo dục', icon: 'GraduationCap', note: 'Giảng dạy, chấm công' },
    { name: 'Đầu tư', icon: 'TrendingUp', note: 'Cổ tức, lợi nhuận' },
    { name: 'Khác', icon: 'Coins', note: 'Thu nhập khác' }
  ]);
  const [expenseCats, setExpenseCats] = React.useState<{name: string, icon: string, note?: string}[]>([
    { name: 'Ăn uống', icon: 'Utensils', note: 'Đồ ăn, thức uống' },
    { name: 'Di chuyển', icon: 'Car', note: 'Xăng xe, đi lại' },
    { name: 'Shopping', icon: 'ShoppingBag', note: 'Mua sắm' },
    { name: 'Hóa đơn', icon: 'Receipt', note: 'Điện, nước, internet' },
    { name: 'Giải trí', icon: 'Film', note: 'Vui chơi, giải trí' },
    { name: 'Khác', icon: 'MoreHorizontal', note: 'Chi phí khác' }
  ]);

  React.useEffect(() => {
    if (classifyingReceipt) {
      const type = (classifyingReceipt.type || 'expense') as 'income' | 'expense' | 'saving';
      setSelectedType(type);
      if (type === 'saving') {
        setSelectedCat(classifyingReceipt.category || 'Tiết kiệm khẩn cấp');
      } else if (type === 'income') {
        setSelectedCat(classifyingReceipt.category || incomeCats[0]?.name || 'Lương');
      } else {
        setSelectedCat(classifyingReceipt.category || expenseCats[0]?.name || 'Ăn uống');
      }
      setMatchField('remitter_name');
      setMatchValue(classifyingReceipt.remitter_name || classifyingReceipt.details || '');
    }
  }, [classifyingReceipt, incomeCats, expenseCats]);

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
    note: string;
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
    isRecurring: boolean;
  } | null>(null);

  // Add new category modal states
  const [addingCatType, setAddingCatType] = React.useState<'income' | 'expense' | null>(null);
  const [newCatName, setNewCatName] = React.useState('');
  const [newCatIcon, setNewCatIcon] = React.useState('Coins');
  const [newCatNote, setNewCatNote] = React.useState('');
  const [newCatBudget, setNewCatBudget] = React.useState('');

  React.useEffect(() => {
    if (editingCat || editingTx || addingCatType) {
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
  }, [editingCat, editingTx, addingCatType]);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingCatType || !newCatName.trim()) {
      showToast('Vui lòng nhập tên danh mục.', 'error');
      return;
    }

    const nameTrimmed = newCatName.trim();
    const isIncome = addingCatType === 'income';
    const list = isIncome ? incomeCats : expenseCats;

    if (list.some(c => c.name.toLowerCase() === nameTrimmed.toLowerCase())) {
      showToast('Tên danh mục này đã tồn tại.', 'error');
      return;
    }

    const newCategoryItem = {
      name: nameTrimmed,
      icon: newCatIcon,
      note: newCatNote.trim() || (isIncome ? 'Thu nhập khác' : 'Chi phí khác')
    };

    const updatedList = [...list, newCategoryItem];
    if (isIncome) {
      setIncomeCats(updatedList);
      localStorage.setItem(`finance_income_cats_${currentUser.id}`, JSON.stringify(updatedList));
    } else {
      setExpenseCats(updatedList);
      localStorage.setItem(`finance_expense_cats_${currentUser.id}`, JSON.stringify(updatedList));
    }

    const bVal = parseNumberDots(newCatBudget) || 0;
    const updatedBudgets = { ...categoryBudgets, [nameTrimmed]: bVal };
    saveBudgets(currentUser.id, updatedBudgets);

    showToast(`Đã thêm danh mục "${nameTrimmed}" mới!`, 'success');
    setAddingCatType(null);
    setNewCatName('');
    setNewCatIcon('Coins');
    setNewCatNote('');
    setNewCatBudget('');
  };

  const [confirmDeleteCatInfo, setConfirmDeleteCatInfo] = useState<{ type: 'income' | 'expense'; index: number; catName: string } | null>(null);

  const handleDeleteCategory = (type: 'income' | 'expense', index: number, catName: string) => {
    const list = type === 'income' ? incomeCats : expenseCats;
    if (list.length <= 1) {
      showToast('Không thể xóa danh mục cuối cùng.', 'error');
      return;
    }
    setConfirmDeleteCatInfo({ type, index, catName });
  };

  const executeDeleteCategory = () => {
    if (!confirmDeleteCatInfo) return;
    const { type, index, catName } = confirmDeleteCatInfo;
    const list = type === 'income' ? incomeCats : expenseCats;

    const updatedList = list.filter((_, idx) => idx !== index);
    if (type === 'income') {
      setIncomeCats(updatedList);
      localStorage.setItem(`finance_income_cats_${currentUser.id}`, JSON.stringify(updatedList));
    } else {
      setExpenseCats(updatedList);
      localStorage.setItem(`finance_expense_cats_${currentUser.id}`, JSON.stringify(updatedList));
    }

    const updatedBudgets = { ...categoryBudgets };
    delete updatedBudgets[catName];
    saveBudgets(currentUser.id, updatedBudgets);

    setEditingCat(null);
    showToast(`Đã xóa danh mục "${catName}".`, 'info');
    setConfirmDeleteCatInfo(null);
  };

  // Filter & Pagination states for Giao dịch section
  const [filterType, setFilterType] = React.useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = React.useState<string>('all');
  const [filterRecurring, setFilterRecurring] = React.useState<'all' | 'co_dinh' | 'tam_thoi' | 'bien_lai'>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const itemsPerPage = 10;

  // Filter Popover Menu toggles
  const [typeFilterOpen, setTypeFilterOpen] = React.useState(false);
  const [catFilterOpen, setCatFilterOpen] = React.useState(false);

  // Helper for matching transactions against selected months (supports fixed/recurring transactions)
  const isTxInSelectedMonths = React.useCallback((t: any, months: string[]) => {
    const txMonth = (t.date || '').substring(0, 7);
    if (!txMonth) return false;
    const isFixed = !!(t.isRecurring || t.is_recurring);
    if (isFixed) {
      return months.some(m => m >= txMonth);
    }
    return months.includes(txMonth);
  }, []);

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

  // Memoized calculations for category actual amounts to prevent lag during re-renders
  const categoryActualsMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    
    incomeCats.forEach(catItem => {
      const catName = catItem.name;
      const manualInc = manualTransactions
        .filter(t => t.type === 'income' && t.category === catName && isTxInSelectedMonths(t, chartSelectedMonths))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      const autoInc = sessions
        .filter(s => s.status === 'Đã dạy' && chartSelectedMonths.includes(s.month_year) && ((s as any).income_category || s.category || incomeCats[1]?.name || 'Giáo dục') === catName)
        .reduce((sum, s) => sum + (Number(s.price) || 0), 0);

      map[catName] = manualInc + autoInc;
    });

    expenseCats.forEach(catItem => {
      const catName = catItem.name;
      map[catName] = manualTransactions
        .filter(t => t.type === 'expense' && t.category === catName && isTxInSelectedMonths(t, chartSelectedMonths))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    });

    return map;
  }, [incomeCats, expenseCats, manualTransactions, sessions, chartSelectedMonths, isTxInSelectedMonths]);

  const getCategoryActual = React.useCallback((catName: string, isExpense?: boolean) => {
    return categoryActualsMap[catName] || 0;
  }, [categoryActualsMap]);

  // Memoized Income and Expense Donut Chart Slices for FlowTab
  const { incomeSlices, expenseSlices, totalPieInc, totalPieExp } = React.useMemo(() => {
    const incomePieTotals = incomeCats.map(cat => ({
      name: cat.name,
      value: categoryActualsMap[cat.name] || 0
    }));

    const expensePieTotals = expenseCats.map(cat => ({
      name: cat.name,
      value: categoryActualsMap[cat.name] || 0
    }));

    const totInc = incomePieTotals.reduce((sum, e) => sum + e.value, 0);
    const totExp = expensePieTotals.reduce((sum, e) => sum + e.value, 0);
    const C_PIE = 314.16;

    const incomeColors: Record<string, string> = {
      'Lương': '#10b981',
      'Giáo dục': '#06b6d4',
      'Đầu tư': '#8b5cf6',
      'Khác': '#f59e0b'
    };

    const expenseColors: Record<string, string> = {
      'Ăn uống': '#f59e0b',
      'Di chuyển': '#3b82f6',
      'Shopping': '#ec4899',
      'Hóa đơn': '#a855f7',
      'Giải trí': '#f43f5e',
      'Khác': '#64748b'
    };

    let accInc = 0;
    const incSlices = incomePieTotals
      .filter(e => e.value > 0)
      .map((e, idx) => {
        const pct = totInc > 0 ? (e.value / totInc) * 100 : 0;
        const len = totInc > 0 ? (e.value / totInc) * C_PIE : 0;
        const offset = accInc;
        accInc += len;
        const fallbackColors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899'];
        return {
          name: e.name,
          value: e.value,
          pct: Math.round(pct),
          color: incomeColors[e.name] || fallbackColors[idx % fallbackColors.length],
          dashArray: `${len} ${C_PIE}`,
          dashOffset: -offset
        };
      });

    let accExp = 0;
    const expSlices = expensePieTotals
      .filter(e => e.value > 0)
      .map((e, idx) => {
        const pct = totExp > 0 ? (e.value / totExp) * 100 : 0;
        const len = totExp > 0 ? (e.value / totExp) * C_PIE : 0;
        const offset = accExp;
        accExp += len;
        const fallbackColors = ['#f59e0b', '#3b82f6', '#ec4899', '#a855f7', '#f43f5e', '#64748b'];
        return {
          name: e.name,
          value: e.value,
          pct: Math.round(pct),
          color: expenseColors[e.name] || fallbackColors[idx % fallbackColors.length],
          dashArray: `${len} ${C_PIE}`,
          dashOffset: -offset
        };
      });

    return {
      incomeSlices: incSlices,
      expenseSlices: expSlices,
      totalPieInc: totInc,
      totalPieExp: totExp
    };
  }, [incomeCats, expenseCats, categoryActualsMap]);

  const getCategoryIconName = (catName: string, type: 'income' | 'expense') => {
    const list = type === 'income' ? incomeCats : expenseCats;
    const found = list.find(c => c.name === catName);
    return found ? found.icon : 'HelpCircle';
  };

  const handleSaveCategoryEdit = () => {
    if (!editingCat || !editingCat.name.trim()) return;
    const { type, index, name: newName, icon: newIcon, note: newNote, budget } = editingCat;
    
    const list = type === 'income' ? incomeCats : expenseCats;
    const oldName = list[index].name;

    // 1. Update list
    const updatedList = list.map((item, idx) => 
      idx === index ? { name: newName.trim(), icon: newIcon, note: (newNote || '').trim() } : item
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
    showToast('Đã cập nhật danh mục thành công!', 'success');
  };

  const handleSaveTxEdit = () => {
    if (!editingTx || !editingTx.desc.trim() || Number(editingTx.amount) <= 0) {
      showToast('Mô tả và số tiền không được để trống.', 'error');
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
            date: editingTx.date,
            isRecurring: editingTx.isRecurring,
            is_recurring: editingTx.isRecurring
          };
        }
        return tx;
      });
      saveTransactions(currentUser.id, updated);
      setEditingTx(null);
      showToast('Đã sửa giao dịch thành công!', 'success');
    }
  };

  // Memoized transactions lists
  const incomes = React.useMemo(() => {
    const manual = manualTransactions
      .filter(t => t.type === 'income' && isTxInSelectedMonths(t, chartSelectedMonths))
      .map(t => ({
        id: t.id,
        desc: t.desc,
        amount: Number(t.amount) || 0,
        category: t.category,
        date: t.date,
        isManual: true,
        isRecurring: !!(t.isRecurring || t.is_recurring),
        type: 'income' as const
      }));

    const auto = sessions
      .filter(s => s.status === 'Đã dạy' && chartSelectedMonths.includes(s.month_year))
      .map(s => ({
        id: `session-${s.id}`,
        desc: `Thu nhập chấm công: ${s.student_name}`,
        amount: Number(s.price) || 0,
        category: (s as any).income_category || s.category || 'Giáo dục',
        date: s.date,
        isManual: false,
        isRecurring: (s.loai_hinh || s.loai_hinh_lich) === 'co_dinh',
        type: 'income' as const
      }));

    return [...manual, ...auto].sort((a, b) => b.date.localeCompare(a.date));
  }, [manualTransactions, sessions, chartSelectedMonths, isTxInSelectedMonths]);

  const expenses = React.useMemo(() => {
    return manualTransactions
      .filter(t => t.type === 'expense' && isTxInSelectedMonths(t, chartSelectedMonths))
      .map(t => ({
        id: t.id,
        desc: t.desc,
        amount: Number(t.amount) || 0,
        category: t.category,
        date: t.date,
        isManual: true,
        isRecurring: !!(t.isRecurring || t.is_recurring),
        type: 'expense' as const
      }));
  }, [manualTransactions, chartSelectedMonths, isTxInSelectedMonths]);

  const transactions = React.useMemo(() => {
    return [...incomes, ...expenses].sort((a, b) => b.date.localeCompare(a.date));
  }, [incomes, expenses]);

  const availableCategories = React.useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.category)));
  }, [transactions]);

  // Filtered Bank Receipts for current selected month(s)
  const filteredBankReceipts = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    return bankReceipts.filter((r: any) => {
      const receiptMonth = (r.trans_date || '').substring(0, 7);
      const matchesMonth = chartSelectedMonths.length === 0 || chartSelectedMonths.includes(receiptMonth);
      const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
      const matchesSearch = !q ||
        (r.remitter_name || '').toLowerCase().includes(q) ||
        (r.beneficiary_name || '').toLowerCase().includes(q) ||
        (r.details || '').toLowerCase().includes(q) ||
        (r.order_number || '').toLowerCase().includes(q);

      return matchesMonth && matchesCategory && matchesSearch;
    });
  }, [bankReceipts, chartSelectedMonths, filterCategory, searchQuery]);

  // Filtered & Paginated Transactions
  const filteredTransactions = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    return transactions.filter(t => {
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
      const matchesSearch = !q || t.desc.toLowerCase().includes(q);
      const matchesRec = filterRecurring === 'all' || 
        (filterRecurring === 'co_dinh' ? t.isRecurring : !t.isRecurring);
      return matchesType && matchesCategory && matchesSearch && matchesRec;
    });
  }, [transactions, filterType, filterCategory, searchQuery, filterRecurring]);

  const totalPages = React.useMemo(() => Math.ceil(filteredTransactions.length / itemsPerPage) || 1, [filteredTransactions.length, itemsPerPage]);

  const paginatedTransactions = React.useMemo(() => {
    return filteredTransactions.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // Month-over-Month Comparison Metrics
  const { totalIncome, totalExpense, netValue, prevIncome, prevExpense, prevNet, incomeChange, expenseChange, netChange } = React.useMemo(() => {
    const totInc = incomes.reduce((sum, t) => sum + t.amount, 0);
    const totExp = expenses.reduce((sum, t) => sum + t.amount, 0);
    const net = totInc - totExp;

    const getPreviousMonthStr = (monthStr: string) => {
      if (!monthStr) return '';
      const [y, m] = monthStr.split('-').map(Number);
      if (m === 1) return `${y - 1}-12`;
      return `${y}-${String(m - 1).padStart(2, '0')}`;
    };

    const prevMonthsList = chartSelectedMonths.map(getPreviousMonthStr).filter(Boolean);

    const pInc = manualTransactions
      .filter(t => t.type === 'income' && isTxInSelectedMonths(t, prevMonthsList))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) +
      sessions
        .filter(s => s.status === 'Đã dạy' && prevMonthsList.includes(s.month_year))
        .reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    const pExp = manualTransactions
      .filter(t => t.type === 'expense' && isTxInSelectedMonths(t, prevMonthsList))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const pNet = pInc - pExp;

    const getChangePct = (curr: number, prev: number) => {
      if (prev === 0) return 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      totalIncome: totInc,
      totalExpense: totExp,
      netValue: net,
      prevIncome: pInc,
      prevExpense: pExp,
      prevNet: pNet,
      incomeChange: getChangePct(totInc, pInc),
      expenseChange: getChangePct(totExp, pExp),
      netChange: getChangePct(net, pNet)
    };
  }, [incomes, expenses, manualTransactions, sessions, chartSelectedMonths, isTxInSelectedMonths]);

  const renderCategoryTable = (type: 'income' | 'expense') => {
    const list = type === 'income' ? incomeCats : expenseCats;
    const isIncome = type === 'income';

    return (
      <div className="overflow-x-auto scrollbar-thin pb-1.5 pt-0.5 -mx-1 px-1">
        <div className="flex flex-col gap-2.5 min-w-[340px] sm:min-w-0">
          {list.map((catItem, idx) => {
            const cat = catItem.name;
            const iconName = catItem.icon;
            const noteText = catItem.note || (isIncome ? 'Thu nhập khác' : 'Chi phí khác');
            const actual = getCategoryActual(cat, !isIncome);
            const budgetVal = categoryBudgets[cat] || 0;
            const rawPct = budgetVal > 0 ? Math.round((actual / budgetVal) * 100) : 0;
            const pct = Math.min(100, rawPct);
            const isAchieved = isIncome && budgetVal > 0 && rawPct >= 100;
            const isOver = !isIncome && budgetVal > 0 && rawPct >= 100;

            let barColorClass = '';
            if (isIncome) {
              if (rawPct <= 40) {
                barColorClass = 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)] drop-shadow-[0_0_3px_rgba(239,68,68,0.4)]';
              } else if (rawPct <= 90) {
                barColorClass = 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_6px_rgba(245,158,11,0.5)] drop-shadow-[0_0_3px_rgba(245,158,11,0.4)]';
              } else {
                barColorClass = 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_6px_rgba(16,185,129,0.5)] drop-shadow-[0_0_3px_rgba(16,185,129,0.4)]';
              }
            } else {
              if (rawPct <= 40) {
                barColorClass = 'bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_6px_rgba(59,130,246,0.5)] drop-shadow-[0_0_3px_rgba(59,130,246,0.4)]';
              } else if (rawPct <= 90) {
                barColorClass = 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_6px_rgba(245,158,11,0.5)] drop-shadow-[0_0_3px_rgba(245,158,11,0.4)]';
              } else {
                barColorClass = 'bg-gradient-to-r from-rose-500 to-pink-400 shadow-[0_0_6px_rgba(239,68,68,0.5)] drop-shadow-[0_0_3px_rgba(239,68,68,0.4)]';
              }
            }

            const cardStyle = isOver
              ? 'bg-rose-500/10 border-rose-500/40 shadow-[inset_0_0_15px_rgba(239,68,68,0.2)] hover:border-rose-500/60'
              : isAchieved
                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[inset_0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/60'
                : 'bg-[#151c2d] border-white/10 hover:border-white/20 shadow-md hover:bg-[#182238]';

            return (
              <div
                key={cat}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left ${cardStyle}`}
              >
                <div className="flex items-center gap-3 shrink-0 min-w-0 max-w-[170px] sm:max-w-[220px]">
                  <span className={`inline-flex p-2.5 rounded-full border shrink-0 transition-all ${
                    isIncome 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.35)]' 
                      : 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
                  }`}>
                    <CategoryIcon iconName={iconName} className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col text-left min-w-0 overflow-hidden">
                    <span className={`font-black text-xs truncate ${isIncome ? 'text-emerald-400 text-glow-green' : 'text-red-500 text-glow-red'}`}>
                      {cat}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                      {noteText}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col text-left shrink-0 min-w-[100px]">
                  <span className="text-xs font-black text-white leading-none">
                    {formatVND(actual)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 leading-none mt-1">
                    / {formatVND(budgetVal)}
                  </span>
                </div>

                <div className="flex-1 max-w-[180px] hidden sm:block">
                  <div className="space-y-1">
                    <div className="h-2.5 bg-[#070912] rounded-full w-full relative overflow-visible p-[2px] border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-extrabold text-slate-400 pt-0.5">
                      <span>{pct}%</span>
                      {rawPct > 100 && (
                        <span className={`${isIncome ? 'text-emerald-400' : 'text-rose-500'} font-black uppercase`}>Vượt!</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setEditingCat({ 
                    type, 
                    index: idx, 
                    name: cat, 
                    icon: iconName, 
                    note: noteText,
                    budget: budgetVal 
                  })}
                  className="h-9 w-9 bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-sm cursor-pointer shrink-0"
                  title="Chỉnh sửa danh mục"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const projectedIncome = React.useMemo(() => {
    const manualInc = manualTransactions
      .filter(t => t.type === 'income' && isTxInSelectedMonths(t, chartSelectedMonths))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const sessionInc = sessions
      .filter(s => s.status !== 'Hủy' && chartSelectedMonths.includes(s.month_year))
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    return manualInc + sessionInc;
  }, [manualTransactions, sessions, chartSelectedMonths, isTxInSelectedMonths]);

  return (
    <div className="space-y-6 animate-mac-dropdown">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4 select-none">
        <div className="flex flex-col text-left">
          <h2 className="text-2xl font-black text-white text-glow-white tracking-tight">Sổ Nhật Ký Dòng Tiền</h2>
          <p className="text-slate-400 text-xs font-semibold mt-0.5">Theo dõi doanh thu, chi phí, lập ngân sách thu chi theo danh mục & thặng dư</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative" data-picker>
            <button
              onClick={() => setMonthPickerOpen(o => !o)}
              className="flex items-center gap-2 bg-[#121624] border border-white/10 hover:border-indigo-500/40 text-white text-xs font-bold rounded-xl px-3.5 py-2 cursor-pointer transition-all shadow-lg"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>
                {chartSelectedMonths.length === 1 
                  ? `Tháng ${chartSelectedMonths[0].split('-')[1]}/${chartSelectedMonths[0].split('-')[0]}` 
                  : `${chartSelectedMonths.length} tháng được chọn`
                }
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${monthPickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {monthPickerOpen && (
              <div className="absolute top-full mt-2 right-0 z-50 bg-[#0d1018]/95 border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-xl w-64 animate-mac-dropdown">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                  <span className="text-xs font-black text-slate-300">Chọn Tháng So Sánh</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setPickerYear(y => y - 1)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs font-bold text-indigo-400">{pickerYear}</span>
                    <button 
                      onClick={() => setPickerYear(y => y + 1)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'].map((mn, i) => {
                    const mNum = String(i + 1).padStart(2, '0');
                    const val = `${pickerYear}-${mNum}`;
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
            className="flex items-center gap-2 px-4 py-2 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all hover:scale-[1.02] shadow-[0_0_12px_rgba(92,54,245,0.45)] hover:shadow-[0_0_18px_rgba(92,54,245,0.65)]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Thêm Giao Dịch</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <div className="kpi-card-purple p-6 flex flex-col justify-between min-h-[120px] text-left">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] font-black text-purple-400 text-glow-purple uppercase tracking-widest block">Thu Nhập Dự Kiến</span>
              <span className="text-xl font-black text-purple-400 text-glow-purple tracking-tight block">{formatVND(projectedIncome)}</span>
              <div className="flex items-center gap-1 select-none">
                <span className="text-[9px] font-black text-purple-300/80">
                  Dự kiến theo lịch trình
                </span>
              </div>
            </div>
            <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-xl shadow-[0_0_12px_rgba(168,85,247,0.35)] shrink-0 flex items-center justify-center">
              <MaterialSymbol icon="monitoring" size={20} className="text-purple-400" />
            </div>
          </div>
        </div>

        <div className="kpi-card-green p-6 flex flex-col justify-between min-h-[120px] text-left">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] font-black text-emerald-400 text-glow-green uppercase tracking-widest block">Thu Nhập</span>
              <span className="text-xl font-black text-emerald-400 text-glow-green tracking-tight block">{formatVND(totalIncome)}</span>
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

        <div className="kpi-card-red p-6 flex flex-col justify-between min-h-[120px] text-left">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] font-black text-rose-500 text-glow-red uppercase tracking-widest block">Chi Tiêu</span>
              <span className="text-xl font-black text-rose-500 text-glow-red tracking-tight block">{formatVND(totalExpense)}</span>
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

        <div className="kpi-card-blue p-6 flex flex-col justify-between min-h-[120px] text-left">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] font-black text-blue-400 text-glow-blue uppercase tracking-widest block">Thặng Dư</span>
              <span className="text-xl font-black text-blue-400 text-glow-blue tracking-tight block">{formatVND(netValue)}</span>
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

      {/* Row 2: 2 Donut/Pie Charts for Income & Expense (4x2x2x1 layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        
        {/* Income Distribution Pie Chart */}
        <div className="calendar-container-depth p-5 bg-[#0e1222] space-y-4 rounded-3xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black text-emerald-400 text-glow-green uppercase tracking-wider">Phân Bổ Thu Nhập Theo Danh Mục</h3>
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Tổng: {formatVND(totalPieInc)}
            </span>
          </div>

          {totalPieInc === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-extrabold bg-[#090c18] rounded-2xl border border-white/5">
              Chưa ghi nhận thu nhập phát sinh trong khoảng thời gian này.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* SVG Donut */}
              <div className="relative shrink-0 w-32 h-32">
                <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="-12 -12 144 144">
                  <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                  {incomeSlices.map((s, idx) => (
                    <circle
                      key={idx}
                      cx="60"
                      cy="60"
                      r="50"
                      fill="transparent"
                      stroke={s.color}
                      strokeWidth="12"
                      strokeDasharray={s.dashArray}
                      strokeDashoffset={s.dashOffset}
                      strokeLinecap={incomeSlices.length > 1 ? 'butt' : 'round'}
                      className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                      style={{ filter: `drop-shadow(0 0 6px ${s.color})` }}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-extrabold text-emerald-400 uppercase leading-none text-glow-green">Thu Nhập</span>
                  <span className="text-xs font-black text-white leading-none mt-1 truncate max-w-[85px]" title={formatVND(totalPieInc)}>
                    {totalPieInc >= 1000000 ? `${(totalPieInc / 1000000).toFixed(1)}M` : formatVND(totalPieInc)}
                  </span>
                </div>
              </div>

              {/* Legend Badges */}
              <div className="flex-1 space-y-2 w-full">
                {incomeSlices.map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                        <span className="text-slate-200 truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 text-[10px] font-semibold">{formatVND(s.value)}</span>
                        <span className="text-white font-black">{s.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#090c18] rounded-full overflow-hidden w-full border border-white/5">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${s.pct}%`, backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expense Distribution Pie Chart */}
        <div className="calendar-container-depth p-5 bg-[#0e1222] space-y-4 rounded-3xl border border-rose-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                <TrendingDown className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black text-rose-400 text-glow-red uppercase tracking-wider">Phân Bổ Chi Tiêu Theo Danh Mục</h3>
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
              Tổng: {formatVND(totalPieExp)}
            </span>
          </div>

          {totalPieExp === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-extrabold bg-[#090c18] rounded-2xl border border-white/5">
              Chưa phát sinh chi tiêu trong khoảng thời gian này.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* SVG Donut */}
              <div className="relative shrink-0 w-32 h-32">
                <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="-12 -12 144 144">
                  <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                  {expenseSlices.map((s, idx) => (
                    <circle
                      key={idx}
                      cx="60"
                      cy="60"
                      r="50"
                      fill="transparent"
                      stroke={s.color}
                      strokeWidth="12"
                      strokeDasharray={s.dashArray}
                      strokeDashoffset={s.dashOffset}
                      strokeLinecap={expenseSlices.length > 1 ? 'butt' : 'round'}
                      className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                      style={{ filter: `drop-shadow(0 0 6px ${s.color})` }}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-extrabold text-rose-400 uppercase leading-none">Chi Tiêu</span>
                  <span className="text-xs font-black text-white leading-none mt-1 truncate max-w-[85px]" title={formatVND(totalPieExp)}>
                    {totalPieExp >= 1000000 ? `${(totalPieExp / 1000000).toFixed(1)}M` : formatVND(totalPieExp)}
                  </span>
                </div>
              </div>

              {/* Legend Badges */}
              <div className="flex-1 space-y-2 w-full">
                {expenseSlices.map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                        <span className="text-slate-200 truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 text-[10px] font-semibold">{formatVND(s.value)}</span>
                        <span className="text-white font-black">{s.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#090c18] rounded-full overflow-hidden w-full border border-white/5">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${s.pct}%`, backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income budget block */}
        <div className="calendar-container-depth p-5 bg-[#06080e] rounded-3xl space-y-4 border-2 border-transparent [background:linear-gradient(#06080e,#06080e)_padding-box,linear-gradient(135deg,#10b981,#34d399,#059669)_border-box] shadow-[0_0_25px_rgba(16,185,129,0.35)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg shadow-[0_0_8px_rgba(16,185,129,0.35)] shrink-0">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="text-[15px] font-black text-emerald-400 text-glow-green uppercase tracking-wider">Loại thu nhập</h3>
            </div>
            <button
              onClick={() => {
                setAddingCatType('income');
                setNewCatName('');
                setNewCatIcon('Coins');
                setNewCatNote('');
                setNewCatBudget('');
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:scale-[1.02]"
              title="Thêm danh mục thu nhập mới"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm</span>
            </button>
          </div>
          {renderCategoryTable('income')}
        </div>

        {/* Expense budget block */}
        <div className="calendar-container-depth p-5 bg-[#06080e] rounded-3xl space-y-4 border-2 border-transparent [background:linear-gradient(#06080e,#06080e)_padding-box,linear-gradient(135deg,#f43f5e,#fb7185,#e11d48)_border-box] shadow-[0_0_25px_rgba(244,63,94,0.35)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg shadow-[0_0_8px_rgba(239,68,68,0.35)] shrink-0">
                <TrendingDown className="h-4 w-4" />
              </div>
              <h3 className="text-[15px] font-black text-red-500 text-glow-red uppercase tracking-wider">Loại chi tiêu</h3>
            </div>
            <button
              onClick={() => {
                setAddingCatType('expense');
                setNewCatName('');
                setNewCatIcon('Utensils');
                setNewCatNote('');
                setNewCatBudget('');
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-black transition-all cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:scale-[1.02]"
              title="Thêm danh mục chi tiêu mới"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm</span>
            </button>
          </div>
          {renderCategoryTable('expense')}
        </div>
      </div>

      <div className="calendar-container-depth p-5 bg-[#06080e] rounded-3xl space-y-4 border-2 border-transparent [background:linear-gradient(#06080e,#06080e)_padding-box,linear-gradient(135deg,#6366f1,#a855f7,#06b6d4)_border-box] shadow-[0_0_25px_rgba(99,102,241,0.35)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg shadow-[0_0_10px_rgba(99,102,241,0.55)]">
                <DollarSign className="h-4 w-4" />
              </div>
              <h3 className="text-[15px] font-black text-indigo-400 text-glow-blue uppercase tracking-wider">Giao dịch</h3>
            </div>

            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              {/* Search Input */}
              <input
                type="text"
                placeholder="Tìm kiếm giao dịch..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="bg-[#0d1018] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-medium text-white focus:outline-none focus:border-indigo-500/50 placeholder-slate-500 min-w-[140px]"
              />

              {/* Category Filter Dropdown */}
              <div className="relative" data-filter-cat>
                <button
                  onClick={() => setCatFilterOpen(o => !o)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    filterCategory !== 'all' 
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' 
                      : 'bg-[#0d1018] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>{filterCategory === 'all' ? 'Tất cả danh mục' : filterCategory}</span>
                </button>
                {catFilterOpen && (
                  <div className="absolute top-full right-0 mt-1.5 z-40 bg-[#0d1018]/95 border border-white/10 rounded-[14px] p-1.5 shadow-2xl text-left font-normal normal-case w-40 max-h-48 overflow-y-auto scrollbar-thin animate-mac-dropdown origin-top">
                    <button
                      onClick={() => { setFilterCategory('all'); setCatFilterOpen(false); setCurrentPage(1); }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-lg ${
                        filterCategory === 'all' ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      Tất cả danh mục
                    </button>
                    {availableCategories.map(catName => (
                      <button
                        key={catName}
                        onClick={() => { setFilterCategory(catName); setCatFilterOpen(false); setCurrentPage(1); }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-lg ${
                          filterCategory === catName ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        {catName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter pill toggle */}
              <div className="relative flex bg-[#0d1018] p-1 rounded-xl border border-white/10 text-xs shrink-0 font-bold select-none min-w-[320px]">
                <div
                  className={`absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none ${
                    filterRecurring === 'all'
                      ? 'bg-[#5c36f5] shadow-[0_0_14px_rgba(92,54,245,0.5)]'
                      : filterRecurring === 'co_dinh'
                      ? 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.5)]'
                      : filterRecurring === 'tam_thoi'
                      ? 'bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.5)]'
                      : 'bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.5)]'
                  }`}
                  style={{
                    left: filterRecurring === 'all' 
                      ? '4px' 
                      : filterRecurring === 'co_dinh' 
                      ? 'calc(25% + 1px)' 
                      : filterRecurring === 'tam_thoi' 
                      ? 'calc(50% + 1px)' 
                      : 'calc(75% + 1px)',
                    width: 'calc(25% - 4px)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => { setFilterRecurring('all'); setCurrentPage(1); }}
                  className={`flex-1 relative z-10 py-1 text-center transition-colors cursor-pointer ${filterRecurring === 'all' ? 'text-white font-black' : 'text-slate-400 hover:text-white'}`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterRecurring('co_dinh'); setCurrentPage(1); }}
                  className={`flex-1 relative z-10 py-1 text-center transition-colors cursor-pointer ${filterRecurring === 'co_dinh' ? 'text-white font-black' : 'text-slate-400 hover:text-white'}`}
                >
                  Cố định
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterRecurring('tam_thoi'); setCurrentPage(1); }}
                  className={`flex-1 relative z-10 py-1 text-center transition-colors cursor-pointer ${filterRecurring === 'tam_thoi' ? 'text-white font-black' : 'text-slate-400 hover:text-white'}`}
                >
                  Tạm thời
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterRecurring('bien_lai'); setCurrentPage(1); }}
                  className={`flex-1 relative z-10 py-1 text-center transition-colors cursor-pointer ${filterRecurring === 'bien_lai' ? 'text-white font-black' : 'text-slate-400 hover:text-white'}`}
                >
                  Biên lai
                </button>
              </div>
            </div>
          </div>

        {filterRecurring === 'bien_lai' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Biên lai ngân hàng Vietcombank ({filteredBankReceipts.length})
              </span>
              <button
                type="button"
                disabled={isSyncing}
                onClick={async () => {
                  if (handleSyncReceipts) {
                    setIsSyncing(true);
                    await handleSyncReceipts();
                    setIsSyncing(false);
                  }
                }}
                className="px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ Gmail'}</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {filteredBankReceipts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-bold bg-[#151c2d]/50 border border-white/5 rounded-2xl">
                  {bankReceipts.length > 0 
                    ? 'Không có biên lai chuyển tiền nào trong tháng đã chọn.' 
                    : 'Chưa có biên lai chuyển tiền nào được ghi nhận từ Gmail.'}
                </div>
              ) : (
                filteredBankReceipts.map((r: any) => {
                  const isClassified = r.status === 'classified';

                  return (
                    <div
                      key={r.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left ${
                        isClassified
                          ? 'bg-[#121829] border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                          : 'bg-[#161320] border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-white">
                            {r.remitter_name || 'N/A'} ➔ {r.beneficiary_name || 'N/A'}
                          </span>
                          {isClassified ? (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Đã phân loại: {r.category} ({r.type === 'income' ? 'Thu' : 'Chi'})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                              Chưa phân loại
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-medium text-slate-400">
                          Nội dung: <span className="text-slate-200 font-bold">{r.details}</span>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold flex-wrap">
                          <span>Mã GD: {r.order_number}</span>
                          <span>•</span>
                          <span>Ngày: {r.trans_date}</span>
                          {r.beneficiary_bank && (
                            <>
                              <span>•</span>
                              <span>NH: {r.beneficiary_bank}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                        <div className="text-right">
                          <span className="text-base font-black text-amber-400 text-glow-amber block">
                            {formatVND(r.amount)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setClassifyingReceipt(r);
                            setSelectedType(r.type || 'expense');
                            setSelectedCat(r.category || (r.type === 'income' ? incomeCats[0]?.name : expenseCats[0]?.name));
                            setMatchField('remitter_name');
                            setMatchValue(r.remitter_name || r.details || '');
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md ${
                            isClassified
                              ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                          }`}
                        >
                          {isClassified ? 'Sửa phân loại' : 'Phân loại'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
        <div className="overflow-x-auto scrollbar-thin pb-1.5 pt-0.5 -mx-1 px-1">
          <div className="flex flex-col gap-2.5 min-w-[500px] sm:min-w-0">
            {paginatedTransactions.length === 0 ? (
              <div className="py-10 text-center text-slate-500 font-bold bg-[#151c2d]/50 border border-white/5 rounded-2xl">
                Chưa ghi nhận giao dịch nào.
              </div>
            ) : (
              paginatedTransactions.map((t) => {
                const isIncome = t.type === 'income';
                const catIcon = getCategoryIconName(t.category, t.type);

                return (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-2xl border transition-all grid grid-cols-[minmax(0,1.8fr)_130px_130px_36px] sm:grid-cols-[minmax(0,2fr)_160px_160px_40px] items-center gap-3 text-left ${
                      isIncome
                        ? 'bg-[#151c2d] border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:border-emerald-500/60 hover:bg-[#192238]'
                        : 'bg-[#151c2d] border-rose-500/35 shadow-[0_0_12px_rgba(239,68,68,0.15)] hover:border-rose-500/60 hover:bg-[#192238]'
                    }`}
                  >
                    <div className="flex flex-col text-left pl-2 min-w-0 pr-2 overflow-hidden">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`font-extrabold text-xs truncate ${isIncome ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {t.desc}
                        </span>
                        {t.isRecurring ? (
                          <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                            Cố định
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-slate-500/15 text-slate-400 border border-slate-500/25 shrink-0">
                            Tạm thời
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                        {t.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 justify-start">
                      <span className={`inline-flex p-2 rounded-full border shrink-0 ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(239,68,68,0.25)]'
                      }`}>
                        <CategoryIcon iconName={catIcon} className="h-4 w-4" />
                      </span>
                      <span className={`font-black text-xs hidden sm:inline truncate ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.category}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`font-black text-sm tracking-wide ${isIncome ? 'text-emerald-400 text-glow-green' : 'text-rose-500 text-glow-red'}`}>
                        {isIncome ? '+' : '-'}{formatVND(t.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-end shrink-0 pr-1">
                      {t.isManual ? (
                        <button
                          onClick={() => setEditingTx({
                            id: t.id,
                            desc: t.desc,
                            amount: t.amount,
                            type: t.type,
                            category: t.category,
                            date: t.date,
                            isRecurring: !!t.isRecurring
                          })}
                          className="h-8.5 w-8.5 bg-white/[0.04] border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-sm cursor-pointer shrink-0"
                          title="Chỉnh sửa hoặc Xóa giao dịch"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => showToast('Giao dịch tự động liên kết với Lịch Trình. Vui lòng chỉnh sửa giá hoặc trạng thái ca dạy trong tab Lịch Trình để cập nhật.', 'info')}
                          className="h-8.5 w-8.5 bg-white/[0.04] border border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-sm cursor-pointer shrink-0"
                          title="Thông tin giao dịch tự động"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        )}

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

      {mounted && editingCat && createPortal(
        <div className="fixed inset-0 bg-[#070911]/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4 text-slate-100">
          <div className="bg-[#0f1320] border border-indigo-500/30 rounded-2xl w-full max-w-md p-6 relative shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-mac-dropdown">
            <h3 className="text-sm font-black text-indigo-400 tracking-wider uppercase mb-5">
              Sửa danh mục: {editingCat.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
            </h3>

            <div className="space-y-4 text-left">
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

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Mô tả phụ / Note (Hiển thị bên dưới tên)</label>
                <input
                  type="text"
                  value={editingCat.note || ''}
                  onChange={(e) => setEditingCat(prev => prev ? { ...prev, note: e.target.value } : null)}
                  placeholder="Ví dụ: Điện, nước, internet..."
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">
                  {editingCat.type === 'income' ? 'Mục tiêu (đ)' : 'Hạn mức (đ)'}
                </label>
                <input
                  type="text"
                  value={formatNumberDots(editingCat.budget)}
                  onChange={(e) => setEditingCat(prev => prev ? { ...prev, budget: parseNumberDots(e.target.value) } : null)}
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

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

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(editingCat.type, editingCat.index, editingCat.name)}
                  className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  title="Xóa danh mục này"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Xóa</span>
                </button>
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
        </div>,
        document.body
      )}

      {/* Modal: Thêm danh mục mới (Income / Expense) */}
      {mounted && addingCatType && createPortal(
        <div className="fixed inset-0 bg-[#070911]/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4 text-slate-100">
          <div className="bg-[#0f1320] border border-indigo-500/30 rounded-2xl w-full max-w-md p-6 relative shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-mac-dropdown">
            <button 
              onClick={() => setAddingCatType(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-black text-indigo-400 tracking-wider uppercase mb-5">
              Thêm Danh Mục {addingCatType === 'income' ? 'Thu Nhập' : 'Chi Tiêu'} Mới
            </h3>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Tên danh mục mới *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Thưởng dự án, Tiền điện..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Mô tả ngắn / Note</label>
                <input
                  type="text"
                  placeholder="Mô tả phụ hiển thị bên dưới..."
                  value={newCatNote}
                  onChange={(e) => setNewCatNote(e.target.value)}
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">
                  {addingCatType === 'income' ? 'Mục tiêu tháng (VND)' : 'Hạn mức ngân sách tháng (VND)'}
                </label>
                <input
                  type="text"
                  placeholder="0"
                  value={newCatBudget}
                  onChange={(e) => setNewCatBudget(formatNumberDots(parseNumberDots(e.target.value)))}
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider block">Chọn biểu tượng</label>
                <div className="grid grid-cols-6 gap-2 bg-[#090b10] p-3 rounded-xl border border-white/5 max-h-40 overflow-y-auto">
                  {Object.keys(ICON_COMPONENTS).map((iconKey) => {
                    const Icon = ICON_COMPONENTS[iconKey];
                    const isSelected = newCatIcon === iconKey;
                    return (
                      <button
                        type="button"
                        key={iconKey}
                        onClick={() => setNewCatIcon(iconKey)}
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

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddingCatType(null)}
                  className="flex-1 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(92,54,245,0.4)] transition-all hover:scale-[1.02] cursor-pointer text-center"
                >
                  Tạo Danh Mục
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {mounted && editingTx && createPortal(
        <div className="fixed inset-0 bg-[#070911]/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4 text-slate-100">
          <div className="bg-[#0f1320] border border-indigo-500/30 rounded-2xl w-full max-w-md p-6 relative shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-mac-dropdown">
            <button 
              onClick={() => setEditingTx(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-black text-indigo-400 tracking-wider uppercase mb-5">Sửa Giao Dịch</h3>

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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-455 uppercase tracking-wider">Số tiền (đ)</label>
                  <input
                    type="text"
                    value={formatNumberDots(editingTx.amount)}
                    onChange={(e) => setEditingTx(prev => prev ? { ...prev, amount: parseNumberDots(e.target.value) } : null)}
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

              <div 
                onClick={() => setEditingTx(prev => prev ? { ...prev, isRecurring: !prev.isRecurring } : null)}
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
                  checked={editingTx.isRecurring} 
                  onChange={(e) => setEditingTx(prev => prev ? { ...prev, isRecurring: e.target.checked } : null)} 
                  className="h-4 w-4 accent-indigo-500 cursor-pointer shrink-0" 
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                {editingTx.id && manualTransactions.some(m => m.id === editingTx.id) && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteManualTx(editingTx.id);
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
        </div>,
        document.body
      )}

      {/* Modal: Phân loại Biên Lai Chuyển Tiền */}
      {mounted && classifyingReceipt && createPortal(
        <div className="fixed inset-0 bg-[#070911]/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4 text-slate-100">
          <div className="bg-[#0f1320] border border-amber-500/30 rounded-2xl w-full max-w-md p-6 relative shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-mac-dropdown">
            <button 
              onClick={() => setClassifyingReceipt(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-black text-amber-400 tracking-wider uppercase mb-1">
              Phân Loại Biên Lai Ngân Hàng
            </h3>
            <p className="text-xs text-slate-400 font-semibold mb-4">
              {classifyingReceipt.remitter_name || 'Biên lai'} ➔ {classifyingReceipt.beneficiary_name || 'Vietcombank'}
            </p>

            <div className="bg-[#090b10] p-3 rounded-xl border border-white/5 space-y-1 mb-4 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-400">Số tiền:</span>
                <span className="text-amber-400 font-black">{formatVND(classifyingReceipt.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nội dung:</span>
                <span className="text-slate-200 truncate max-w-[200px]">{classifyingReceipt.details}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mã lệnh GD:</span>
                <span className="text-slate-300">{classifyingReceipt.order_number}</span>
              </div>
            </div>

            <div className="space-y-4 text-left">
              {/* Type selection with 3-way animated sliding tab toggle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Loại Giao Dịch</label>
                <div className="relative bg-[#070911]/80 p-1 rounded-2xl border border-white/10 flex items-center justify-between overflow-hidden shadow-inner">
                  <div
                    className={`absolute top-1 bottom-1 rounded-[10px] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none ${
                      selectedType === 'expense'
                        ? 'bg-rose-500 shadow-[0_0_14px_rgba(239,68,68,0.4)]'
                        : selectedType === 'income'
                        ? 'bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                        : 'bg-blue-500 shadow-[0_0_14px_rgba(59,130,246,0.4)]'
                    }`}
                    style={{
                      left: '4px',
                      width: 'calc(33.333% - 4px)',
                      transform:
                        selectedType === 'expense'
                          ? 'translateX(0)'
                          : selectedType === 'income'
                          ? 'translateX(100%)'
                          : 'translateX(200%)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType('expense');
                      if (!expenseCats.some(c => c.name === selectedCat)) {
                        setSelectedCat(expenseCats[0]?.name || 'Khác');
                      }
                    }}
                    className={`relative z-10 flex-1 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors duration-300 cursor-pointer ${
                      selectedType === 'expense' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Chi tiêu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType('income');
                      if (!incomeCats.some(c => c.name === selectedCat)) {
                        setSelectedCat(incomeCats[0]?.name || 'Lương');
                      }
                    }}
                    className={`relative z-10 flex-1 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors duration-300 cursor-pointer ${
                      selectedType === 'income' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Thu nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType('saving');
                      setSelectedCat('Tiết kiệm khẩn cấp');
                    }}
                    className={`relative z-10 flex-1 py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors duration-300 cursor-pointer ${
                      selectedType === 'saving' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tiết kiệm
                  </button>
                </div>
              </div>

              {/* Category selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Chọn Danh Mục</label>
                <select
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                  className="w-full bg-[#0d1018] border border-white/10 text-xs font-bold text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-500"
                >
                  {selectedType === 'saving' ? (
                    <>
                      <option value="Tiết kiệm khẩn cấp">Tiết kiệm khẩn cấp</option>
                      <option value="Tích lũy dài hạn">Tích lũy dài hạn</option>
                      <option value="Tiết kiệm khác">Tiết kiệm khác</option>
                    </>
                  ) : (
                    (selectedType === 'income' ? incomeCats : expenseCats).map(cat => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name} {cat.note ? `(${cat.note})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Auto-classification Rule Settings */}
              <div className="p-3 bg-[#090b10] rounded-xl border border-amber-500/20 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chkCreateRule"
                    checked={createRule}
                    onChange={(e) => setCreateRule(e.target.checked)}
                    className="h-4 w-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <label htmlFor="chkCreateRule" className="text-xs font-bold text-amber-300 cursor-pointer select-none">
                    Tự động phân loại biên lai tương tự sau này
                  </label>
                </div>

                {createRule && (
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase">Khớp theo trường</label>
                      <select
                        value={matchField}
                        onChange={(e) => {
                          const f = e.target.value as any;
                          setMatchField(f);
                          if (f === 'remitter_name') setMatchValue(classifyingReceipt.remitter_name || '');
                          else if (f === 'beneficiary_name') setMatchValue(classifyingReceipt.beneficiary_name || '');
                          else if (f === 'details') setMatchValue(classifyingReceipt.details || '');
                        }}
                        className="w-full bg-[#0d1018] border border-white/10 text-[11px] font-semibold text-white rounded-lg px-2.5 py-1.5 focus:outline-none"
                      >
                        <option value="remitter_name">Người chuyển (Remitter Name)</option>
                        <option value="beneficiary_name">Người hưởng (Beneficiary Name)</option>
                        <option value="details">Nội dung chuyển tiền (Details)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase">Từ khóa nhận diện</label>
                      <input
                        type="text"
                        value={matchValue}
                        onChange={(e) => setMatchValue(e.target.value)}
                        placeholder="Nhập từ khóa khớp..."
                        className="w-full bg-[#0d1018] border border-white/10 text-xs font-semibold text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setClassifyingReceipt(null)}
                  className="flex-1 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSavingClassification}
                  onClick={async () => {
                    if (handleClassifyReceipt && classifyingReceipt) {
                      setIsSavingClassification(true);
                      await handleClassifyReceipt(
                        classifyingReceipt.id,
                        selectedType,
                        selectedCat,
                        createRule,
                        matchField,
                        matchValue
                      );
                      setIsSavingClassification(false);
                      setClassifyingReceipt(null);
                    }
                  }}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all hover:scale-[1.02] cursor-pointer text-center disabled:opacity-50"
                >
                  {isSavingClassification ? 'Đang lưu...' : 'Lưu & Phân loại'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Confirm Category Deletion Modal */}
      {confirmDeleteCatInfo && (
        <ConfirmModal
          isOpen={!!confirmDeleteCatInfo}
          title="Xóa Danh Mục"
          message={`Bạn có chắc chắn muốn xóa danh mục "${confirmDeleteCatInfo.catName}"?`}
          confirmLabel="Xóa Danh Mục"
          cancelLabel="Hủy Bỏ"
          variant="danger"
          onConfirm={executeDeleteCategory}
          onClose={() => setConfirmDeleteCatInfo(null)}
        />
      )}
    </div>
  );
}

export default React.memo(FlowTab);

import React from 'react';
import { 
  Plus, 
  Settings, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2,
  DollarSign,
  Edit2,
  Briefcase,
  GraduationCap,
  TrendingUp,
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
  Coffee
} from 'lucide-react';
import { formatVND, Session } from '@/lib/utils';

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
}

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
  saveTransactions
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

  // Load from localStorage or set defaults
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

  // State to manage editing a category
  const [editingCat, setEditingCat] = React.useState<{
    type: 'income' | 'expense';
    index: number;
    name: string;
    icon: string;
  } | null>(null);

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

  const handleEditBudgetPrompt = (cat: string) => {
    const currentBudgetVal = categoryBudgets[cat] || 0;
    const input = prompt(`Nhập hạn mức ngân sách hàng tháng mới cho danh mục "${cat}":`, String(currentBudgetVal));
    if (input === null) return;
    const num = Number(input);
    if (isNaN(num) || num < 0) {
      alert('Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    const updated = {
      ...categoryBudgets,
      [cat]: num
    };
    saveBudgets(currentUser.id, updated);
  };

  const handleSaveCategoryEdit = () => {
    if (!editingCat || !editingCat.name.trim()) return;
    const { type, index, name: newName, icon: newIcon } = editingCat;
    
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

    // 2. Transfer budget
    const oldBudget = categoryBudgets[oldName] || 0;
    if (oldName !== newName.trim()) {
      const updatedBudgets = { ...categoryBudgets };
      delete updatedBudgets[oldName];
      updatedBudgets[newName.trim()] = oldBudget;
      saveBudgets(currentUser.id, updatedBudgets);
    }

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

  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const netValue = totalIncome - totalExpense;

  const renderCategoryTable = (type: 'income' | 'expense') => {
    const list = type === 'income' ? incomeCats : expenseCats;
    const isIncome = type === 'income';

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-bold text-slate-350">
          <thead>
            <tr className="border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-wider">
              <th className="py-2.5 text-center w-10">Icon</th>
              <th className="py-2.5 text-left">Tên danh mục</th>
              <th className="py-2.5 text-right">Thực tế</th>
              <th className="py-2.5 text-right">{isIncome ? 'Mục tiêu' : 'Hạn mức'}</th>
              <th className="py-2.5 text-center w-32">Tiến độ</th>
              <th className="py-2.5 text-center w-16">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((catItem, idx) => {
              const cat = catItem.name;
              const iconName = catItem.icon;
              const actual = getCategoryActual(cat, !isIncome);
              const budgetVal = categoryBudgets[cat] || 0;
              const pct = budgetVal > 0 ? Math.min(100, Math.round((actual / budgetVal) * 100)) : 0;
              const isOver = !isIncome && actual > budgetVal;

              return (
                <tr key={cat} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3 text-center">
                    <span className={`inline-flex p-1.5 rounded-lg border ${
                      isIncome 
                        ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/15' 
                        : 'bg-rose-500/10 text-rose-450 border-rose-500/15'
                    }`}>
                      <CategoryIcon iconName={iconName} className="h-3.5 w-3.5" />
                    </span>
                  </td>
                  <td className="py-3 text-left font-bold text-white">
                    {cat}
                  </td>
                  <td className="py-3 text-right text-slate-200">
                    {formatVND(actual)}
                  </td>
                  <td className="py-3 text-right text-slate-450">
                    {formatVND(budgetVal)}
                  </td>
                  <td className="py-3 text-center px-4">
                    <div className="space-y-1">
                      <div className="h-1.5 bg-[#101420] rounded-full overflow-hidden w-full">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isIncome 
                              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' 
                              : (isOver ? 'bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'bg-indigo-500')
                          }`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[8px] font-extrabold text-slate-555">
                        <span>{pct}%</span>
                        {isOver && <span className="text-rose-455 font-black uppercase">Vượt!</span>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setEditingCat({ type, index: idx, name: cat, icon: iconName })}
                        className="p-1 hover:bg-white/5 text-slate-500 hover:text-indigo-400 rounded transition-all cursor-pointer"
                        title="Sửa tên & biểu tượng"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleEditBudgetPrompt(cat)}
                        className="p-1 hover:bg-white/5 text-slate-500 hover:text-indigo-400 rounded transition-all cursor-pointer"
                        title="Sửa hạn mức"
                      >
                        <Settings className="h-3 w-3" />
                      </button>
                    </div>
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
          <h2 className="text-2xl font-black text-white tracking-tight">Sổ Nhật Ký Dòng Tiền</h2>
          <p className="text-slate-400 text-xs font-semibold">Liệt kê tất cả các khoản chi tiêu và nguồn thu nhập thực tế trong bộ lọc tháng.</p>
        </div>
        
        <button
          onClick={() => handleOpenTxModal('expense')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.01]"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm giao dịch mới</span>
        </button>
      </div>

      {/* Overall Value Cards (Glow UI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Income overall card */}
        <div className="relative group overflow-hidden bg-[#131b25]/60 border border-emerald-500/20 rounded-2xl p-5 shadow-[0_0_15px_rgba(16,185,129,0.08)] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/40 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/20 to-emerald-500"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-emerald-450 uppercase tracking-widest block">Tổng Thu Nhập</span>
              <span className="text-xl font-black text-white tracking-tight block">{formatVND(totalIncome)}</span>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-xl">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Expense overall card */}
        <div className="relative group overflow-hidden bg-[#1b151e]/60 border border-rose-500/20 rounded-2xl p-5 shadow-[0_0_15px_rgba(239,68,68,0.08)] hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:border-rose-500/40 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-rose-500/20 to-rose-500"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-rose-450 uppercase tracking-widest block">Tổng Chi Tiêu</span>
              <span className="text-xl font-black text-white tracking-tight block">{formatVND(totalExpense)}</span>
            </div>
            <div className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/25 rounded-xl">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Net overall card */}
        <div className={`relative group overflow-hidden bg-[#15172b]/60 border rounded-2xl p-5 transition-all duration-300 ${
          netValue >= 0 
            ? 'border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.08)] hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:border-indigo-500/40' 
            : 'border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.08)] hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-500/40'
        }`}>
          <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${
            netValue >= 0 ? 'from-indigo-500/20 to-indigo-500' : 'from-amber-500/20 to-amber-500'
          }`}></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className={`text-[10px] font-black uppercase tracking-widest block ${
                netValue >= 0 ? 'text-indigo-400' : 'text-amber-450'
              }`}>Tổng Thặng Dư (Net)</span>
              <span className="text-xl font-black text-white tracking-tight block">{formatVND(netValue)}</span>
            </div>
            <div className={`p-2 border rounded-xl ${
              netValue >= 0 
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
            }`}>
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Category Tables split into 2 sections (Glow UI) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Income budget block */}
        <div className="calendar-container-depth p-5 bg-[#141824] space-y-4 border border-white/5 hover:border-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.04)] transition-all duration-300">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]"></div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Loại thu nhập</h3>
            </div>
            <span className="text-[9px] text-slate-500 font-extrabold block">Click icon sửa để đổi tên & biểu tượng.</span>
          </div>
          {renderCategoryTable('income')}
        </div>

        {/* Expense budget block */}
        <div className="calendar-container-depth p-5 bg-[#141824] space-y-4 border border-white/5 hover:border-rose-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.04)] transition-all duration-300">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]"></div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Loại chi tiêu (Expense type)</h3>
            </div>
            <span className="text-[9px] text-slate-500 font-extrabold block">Click icon sửa để đổi tên & biểu tượng.</span>
          </div>
          {renderCategoryTable('expense')}
        </div>

      </div>

      {/* Unified Transaction List */}
      <div className="calendar-container-depth p-5 bg-[#141824] space-y-4 border border-white/5 hover:border-indigo-500/20 hover:shadow-[0_0_15px_rgba(99,102,241,0.04)] transition-all duration-300">
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded-lg">
              <DollarSign className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Giao dịch</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-bold text-slate-350">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-2.5 text-center font-black w-12">Loại</th>
                <th className="py-2.5 text-left font-black">Chi tiết giao dịch</th>
                <th className="py-2.5 text-left font-black">Danh mục</th>
                <th className="py-2.5 text-right font-black">Số tiền</th>
                <th className="py-2.5 text-center font-black w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500 font-bold">Chưa ghi nhận giao dịch nào.</td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const isIncome = t.type === 'income';
                  return (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 text-center">
                        <span className={`inline-flex p-1.5 rounded-lg border ${
                          isIncome 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}>
                          <DollarSign className="h-3.5 w-3.5" />
                        </span>
                      </td>
                      <td className="py-3 text-left">
                        <p className="text-white font-bold">{t.desc}</p>
                        <span className="text-[8.5px] font-extrabold text-slate-550 block mt-0.5">{t.date}</span>
                      </td>
                      <td className="py-3 text-left">
                        <span className="px-1.5 py-0.5 bg-[#0d1018] rounded text-[9px] border border-white/5">{t.category}</span>
                      </td>
                      <td className={`py-3 text-right font-black ${
                        isIncome ? 'text-emerald-400' : 'text-rose-455'
                      }`}>
                        {isIncome ? '+' : '-'}{formatVND(t.amount)}
                      </td>
                      <td className="py-3 text-center">
                        {t.isManual && (
                          <button
                            onClick={() => handleDeleteManualTx(t.id)}
                            className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-455 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Xóa giao dịch"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}

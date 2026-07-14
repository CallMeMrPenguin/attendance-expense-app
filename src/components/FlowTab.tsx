import React from 'react';
import { 
  Plus, 
  Settings, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2 
} from 'lucide-react';
import { formatVND, Session } from '@/lib/utils';

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
}

const INCOME_CATEGORIES = ['Lương', 'Giáo dục', 'Đầu tư', 'Khác'];
const EXPENSE_CATEGORIES = ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'];

export default function FlowTab({
  currentUser,
  manualTransactions,
  sessions,
  categoryBudgets,
  chartSelectedMonths,
  getActualCategoryAmount,
  handleDeleteManualTx,
  handleOpenTxModal,
  saveBudgets
}: FlowTabProps) {

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

  const incomes = getIncomeTransactions();
  const expenses = getExpenseTransactions();

  return (
    <div className="space-y-6 animate-mac-dropdown text-left">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-white tracking-tight">Sổ Nhật Ký Dòng Chảy</h2>
          <p className="text-slate-400 text-xs font-semibold">Liệt kê tất cả các khoản chi tiêu và nguồn thu nhập thực tế trong bộ lọc tháng.</p>
        </div>
        
        <button
          onClick={() => handleOpenTxModal('expense')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm giao dịch mới</span>
        </button>
      </div>

      {/* Categories Budget tracker block */}
      <div className="calendar-container-depth p-5 bg-[#141824] space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Hạn mức ngân sách & thực tế theo danh mục (Hàng tháng)</h3>
          </div>
          <span className="text-[9px] text-slate-500 font-extrabold block">Double-click hoặc click icon settings để sửa hạn mức.</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map(cat => {
            const actual = getActualCategoryAmount(cat);
            const budgetVal = categoryBudgets[cat] || 0;
            const pct = budgetVal > 0 ? Math.min(100, Math.round((actual / budgetVal) * 100)) : 0;
            const isExpense = EXPENSE_CATEGORIES.includes(cat);
            const isOver = isExpense && actual > budgetVal;

            return (
              <div key={cat} className="bg-[#181d2e]/60 border border-white/5 rounded-2xl p-4 space-y-2 relative group">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-350">{cat}</span>
                  <button
                    onClick={() => handleEditBudgetPrompt(cat)}
                    className="p-1 hover:bg-white/[0.05] rounded text-slate-400 hover:text-indigo-400 transition-colors"
                    title="Sửa hạn mức"
                  >
                    <Settings className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex justify-between text-[11px] font-black text-white">
                  <span>{formatVND(actual)}</span>
                  <span className="text-slate-500">Hạn mức: {formatVND(budgetVal)}</span>
                </div>

                {/* Progress bar line */}
                <div className="h-1.5 bg-[#101420] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isExpense 
                        ? (isOver ? 'bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'bg-indigo-500') 
                        : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                    }`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[9px] font-extrabold text-slate-500">
                  <span>{isExpense ? 'Đã chi tiêu' : 'Đã thu nhập'}</span>
                  <span className={isOver ? 'text-rose-455' : ''}>{pct}% {isOver && '(Vượt ngân sách!)'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Separated lists stacked/side-by-side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Income block */}
        <div className="calendar-container-depth p-5 bg-[#141824] space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-450 border border-emerald-500/25 rounded-lg">
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Danh Sách Thu Nhập</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-bold text-slate-350">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-2.5 text-left font-black">Tên thu nhập</th>
                  <th className="py-2.5 text-left font-black">Loại hình</th>
                  <th className="py-2.5 text-right font-black">Số tiền</th>
                  <th className="py-2.5 text-center font-black w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {incomes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500 font-bold">Chưa ghi nhận nguồn thu nào.</td>
                  </tr>
                ) : (
                  incomes.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 text-left">
                        <p className="text-white font-bold">{t.desc}</p>
                        <span className="text-[8.5px] font-extrabold text-slate-550 block mt-0.5">{t.date}</span>
                      </td>
                      <td className="py-3 text-left">
                        <span className="px-1.5 py-0.5 bg-[#0d1018] rounded text-[9px] border border-white/5">{t.category}</span>
                      </td>
                      <td className="py-3 text-right text-emerald-400 font-black">+{formatVND(t.amount)}</td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense block */}
        <div className="calendar-container-depth p-5 bg-[#141824] space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
            <div className="p-1.5 bg-rose-500/10 text-rose-450 border border-rose-500/25 rounded-lg">
              <ArrowDownRight className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Danh Sách Chi Tiêu</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-bold text-slate-350">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-2.5 text-left font-black">Tên chi tiêu</th>
                  <th className="py-2.5 text-left font-black">Loại hình</th>
                  <th className="py-2.5 text-right font-black">Số tiền</th>
                  <th className="py-2.5 text-center font-black w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500 font-bold">Chưa phát sinh giao dịch chi tiêu.</td>
                  </tr>
                ) : (
                  expenses.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 text-left">
                        <p className="text-white font-bold">{t.desc}</p>
                        <span className="text-[8.5px] font-extrabold text-slate-550 block mt-0.5">{t.date}</span>
                      </td>
                      <td className="py-3 text-left">
                        <span className="px-1.5 py-0.5 bg-[#0d1018] rounded text-[9px] border border-white/5">{t.category}</span>
                      </td>
                      <td className="py-3 text-right text-rose-455 font-black">-{formatVND(t.amount)}</td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

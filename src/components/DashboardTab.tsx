import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatVND, Session, formatDateVN } from '@/lib/utils';
import MaterialSymbol from './MaterialSymbol';

interface DashboardTabProps {
  currentUser: {
    teacherName: string;
  };
  manualTransactions: any[];
  sessions: Session[];
  emergencyCurrent: number;
  accumulationCurrent: number;
  categoryBudgets: Record<string, number>;
  chartSelectedMonths: string[];
  toggleChartMonth: (mStr: string) => void;
  chartYear: number;
  setChartYear: React.Dispatch<React.SetStateAction<number>>;
  
  // Finance getters passed from orchestrator
  getWeeklyIncome: (monthStr: string, startDay: number, endDay: number) => number;
  getWeeklyExpense: (monthStr: string, startDay: number, endDay: number) => number;
  getMonthlyIncome: (monthStr: string) => number;
  getMonthlyExpense: (monthStr: string) => number;
  getSelectedMonthsIncome: () => number;
  getSelectedMonthsExpense: () => number;
  getTotalIncome: () => number;
  getTotalExpense: () => number;
  getActualCategoryAmount: (cat: string) => number;
  
  handleOpenTxModal: (type: 'income' | 'expense' | 'saving') => void;
  setActiveTab: (tab: 'dashboard' | 'flow' | 'saving' | 'schedule' | 'settings') => void;
}

export default function DashboardTab({
  currentUser,
  manualTransactions,
  sessions,
  emergencyCurrent,
  accumulationCurrent,
  categoryBudgets,
  chartSelectedMonths,
  toggleChartMonth,
  chartYear,
  setChartYear,
  
  getWeeklyIncome,
  getWeeklyExpense,
  getMonthlyIncome,
  getMonthlyExpense,
  getSelectedMonthsIncome,
  getSelectedMonthsExpense,
  getTotalIncome,
  getTotalExpense,
  getActualCategoryAmount,
  
  handleOpenTxModal,
  setActiveTab
}: DashboardTabProps) {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const income = getSelectedMonthsIncome();
  const expense = getSelectedMonthsExpense();
  const net = income - expense;

  // Net worth cumulative calculation
  const totalIncomeAll = getTotalIncome();
  const totalExpenseAll = getTotalExpense();
  const walletCash = totalIncomeAll - totalExpenseAll;
  const savings = emergencyCurrent + accumulationCurrent;
  const netWorth = walletCash + savings;
  const savingsMargin = income > 0 ? Math.round((net / income) * 100) : 0;

  // Helper for line chart drawing
  const getLineData = () => {
    if (chartSelectedMonths.length === 0) return [];
    
    if (chartSelectedMonths.length === 1) {
      const targetMonth = chartSelectedMonths[0];
      return [
        { label: 'Tuần 1', income: getWeeklyIncome(targetMonth, 1, 7), expense: getWeeklyExpense(targetMonth, 1, 7) },
        { label: 'Tuần 2', income: getWeeklyIncome(targetMonth, 8, 14), expense: getWeeklyExpense(targetMonth, 8, 14) },
        { label: 'Tuần 3', income: getWeeklyIncome(targetMonth, 15, 21), expense: getWeeklyExpense(targetMonth, 15, 21) },
        { label: 'Tuần 4', income: getWeeklyIncome(targetMonth, 22, 31), expense: getWeeklyExpense(targetMonth, 22, 31) }
      ];
    }

    // Sort chronologically
    const sorted = [...chartSelectedMonths].sort((a, b) => a.localeCompare(b));
    return sorted.map(m => {
      const [y, mn] = m.split('-');
      return {
        label: `Th.${Number(mn)}/${y.substring(2)}`,
        income: getMonthlyIncome(m),
        expense: getMonthlyExpense(m),
        rawMonth: m
      };
    });
  };

  // Curvy path calculations
  const lineData = getLineData();
  const maxVal = Math.max(1000000, ...lineData.flatMap(d => [d.income, d.expense]));
  const N = lineData.length;

  const incomePts = lineData.map((d, idx) => {
    const x = N > 1 ? 85 + idx * (500 / (N - 1)) : 85;
    const y = 150 - (d.income / maxVal) * 120;
    return { x, y };
  });

  const expensePts = lineData.map((d, idx) => {
    const x = N > 1 ? 85 + idx * (500 / (N - 1)) : 85;
    const y = 150 - (d.expense / maxVal) * 120;
    return { x, y };
  });

  const getCurvyPath = (pts: { x: number, y: number }[]) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const dx = p1.x - p0.x;
      d += ` C ${p0.x + dx / 2} ${p0.y}, ${p0.x + dx / 2} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const getAreaPath = (pts: { x: number, y: number }[]) => {
    const linePath = getCurvyPath(pts);
    if (!linePath) return '';
    return `${linePath} L ${pts[pts.length - 1].x} 150 L ${pts[0].x} 150 Z`;
  };

  // Donut Chart Expense Circle segment variables
  const categoriesList = ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'];
  const expenseTotals = categoriesList.map(cat => ({
    name: cat,
    value: getActualCategoryAmount(cat)
  }));

  const totalSelectedExp = getSelectedMonthsExpense();
  const C = 314.16; // 2 * pi * r (r=50)
  let accumulatedDash = 0;

  const colorsMap: Record<string, string> = {
    'Ăn uống': '#f59e0b',
    'Di chuyển': '#3b82f6',
    'Shopping': '#ec4899',
    'Hóa đơn': '#a855f7',
    'Giải trí': '#f43f5e',
    'Khác': '#64748b'
  };

  const slices = expenseTotals
    .filter(e => e.value > 0)
    .map(e => {
      const pct = (e.value / totalSelectedExp) * 100;
      const len = (e.value / totalSelectedExp) * C;
      const offset = accumulatedDash;
      accumulatedDash += len;
      return {
        name: e.name,
        value: e.value,
        pct: Math.round(pct),
        color: colorsMap[e.name] || '#64748b',
        dashArray: `${len} ${C}`,
        dashOffset: -offset
      };
    });

  // Budget vs Actual tracker variables
  const M = chartSelectedMonths.length;
  const totalExpBudget = Object.keys(categoryBudgets)
    .filter(c => ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'].includes(c))
    .reduce((sum, c) => sum + (categoryBudgets[c] || 0), 0) * M;

  const budgetPercent = totalExpBudget > 0 ? Math.min(100, Math.round((expense / totalExpBudget) * 100)) : 0;
  const isOverBudget = expense > totalExpBudget;

  // Recent transactions stream preview
  const recentTransactions = React.useMemo(() => {
    const list = manualTransactions.map(t => ({
      id: t.id,
      desc: t.desc,
      amount: Number(t.amount) || 0,
      type: t.type as 'income' | 'expense',
      date: t.date,
      category: t.category
    }));
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4);
  }, [manualTransactions]);

  return (
    <div className="space-y-6 animate-mac-dropdown select-none">
      
      {/* Editorial Hero Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#0d101e] via-[#141829] to-[#0f121d] border border-white/10 p-6 sm:p-7 shadow-[0_16px_50px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Ambient Glow Orbs */}
        <div className="absolute -top-12 -left-12 w-56 h-56 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 right-12 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-black tracking-widest uppercase shadow-[0_0_15px_rgba(92,54,245,0.25)]">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Trung Tâm Quản Lý Tài Chính & Dòng Tiền</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Xin chào, <span className="bg-gradient-to-r from-white via-indigo-200 to-purple-400 bg-clip-text text-transparent">{currentUser.teacherName}</span>
            </h1>
            
            <p className="text-slate-400 text-xs sm:text-sm font-semibold leading-relaxed">
              Theo dõi biến động dòng tiền, kiểm soát hạn mức ngân sách chi tiêu và phân bổ quỹ tích lũy thông minh.
            </p>

            {/* Quick Metrics Badges */}
            <div className="pt-1 flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.04] border border-white/10 rounded-xl text-[10px] font-black text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <span>Tỉ lệ tích lũy: {savingsMargin}%</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.04] border border-white/10 rounded-xl text-[10px] font-black text-slate-300">
                <span className={`h-2 w-2 rounded-full ${isOverBudget ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'}`}></span>
                <span>Hạn mức sử dụng: {budgetPercent}%</span>
              </div>
            </div>
          </div>

          {/* Action CTA Button */}
          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => handleOpenTxModal('expense')}
              className="flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-[#5c36f5] to-[#7351f7] hover:from-[#6b47ff] hover:to-[#8363ff] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-[0_6px_20px_rgba(92,54,245,0.45)] hover:shadow-[0_0_25px_rgba(92,54,245,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-white/20 select-none"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm giao dịch mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Glowing Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 text-left">
        
        {/* Card 1: Cumulative Net Worth */}
        <div className="kpi-card-purple p-6 flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-purple-400 text-glow-purple uppercase tracking-widest block">
                Tổng tài sản tích lũy
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none block pt-1.5" title={formatVND(netWorth)}>
                {formatVND(netWorth)}
              </span>
            </div>
            <div className="p-2.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded-2xl shadow-[0_0_12px_rgba(168,85,247,0.35)] shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between text-[10px] font-extrabold text-purple-300/80">
            <span>Ví: {formatVND(walletCash)}</span>
            <span>Tiết kiệm: {formatVND(savings)}</span>
          </div>
        </div>

        {/* Card 2: Income for Selected Period */}
        <div className="kpi-card-green p-6 flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-emerald-400 text-glow-green uppercase tracking-widest block">
                Thu nhập tháng chọn
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 text-glow-green tracking-tight leading-none block pt-1.5" title={formatVND(income)}>
                {formatVND(income)}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-2xl shadow-[0_0_12px_rgba(16,185,129,0.35)] shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-[10px] font-extrabold text-emerald-300/90">
            <span className="flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> Thu về từ các nguồn
            </span>
            <span className="bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
              {chartSelectedMonths.length} tháng
            </span>
          </div>
        </div>

        {/* Card 3: Expenses for Selected Period */}
        <div className="kpi-card-red p-6 flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-rose-400 text-glow-red uppercase tracking-widest block">
                Chi tiêu tháng chọn
              </span>
              <span className="text-2xl sm:text-3xl font-black text-rose-400 text-glow-red tracking-tight leading-none block pt-1.5" title={formatVND(expense)}>
                {formatVND(expense)}
              </span>
            </div>
            <div className="p-2.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-2xl shadow-[0_0_12px_rgba(239,68,68,0.35)] shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-500/20 flex items-center justify-between text-[10px] font-extrabold text-rose-300/90">
            <span className="flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3" /> {totalExpBudget > 0 ? `${budgetPercent}% ngân sách` : 'Chi phí phát sinh'}
            </span>
            <span className="bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
              {isOverBudget ? 'Vượt hạn mức' : 'An toàn'}
            </span>
          </div>
        </div>

        {/* Card 4: Net Surplus (Thu - Chi) with MaterialSymbol currency_exchange */}
        <div className="kpi-card-blue p-6 flex flex-col justify-between min-h-[150px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-cyan-400 text-glow-blue uppercase tracking-widest block">
                Net Thặng Dư Ròng
              </span>
              <span className={`text-2xl sm:text-3xl font-black tracking-tight leading-none block pt-1.5 ${net >= 0 ? 'text-cyan-400 text-glow-blue' : 'text-rose-400 text-glow-red'}`} title={formatVND(net)}>
                {formatVND(net)}
              </span>
            </div>
            <div className="p-2.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded-2xl shadow-[0_0_12px_rgba(6,182,212,0.35)] shrink-0 flex items-center justify-center">
              <MaterialSymbol icon="currency_exchange" size={22} className="text-cyan-300" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-cyan-500/20 flex items-center justify-between text-[10px] font-extrabold text-cyan-300/90">
            <span>Tỷ suất dư: {income > 0 ? `${savingsMargin}%` : '0%'}</span>
            <span className="bg-cyan-500/20 px-2 py-0.5 rounded-md border border-cyan-500/30">
              {net >= 0 ? 'Thặng dư' : 'Thâm hụt'}
            </span>
          </div>
        </div>

      </div>

      {/* Sleek Multi-Month Selector Toolbar */}
      <div className="calendar-container-depth p-4 bg-[#111422] text-left">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3.5 select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-wider">Bộ Lọc So Sánh Dữ Liệu Biểu Đồ</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Chọn một hoặc nhiều tháng trong năm {chartYear} để đối chiếu</p>
            </div>
          </div>

          {/* Controls bar: presets + year switcher */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                const curM = `${chartYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                if (!chartSelectedMonths.includes(curM)) toggleChartMonth(curM);
              }}
              className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl text-[10px] font-extrabold text-indigo-300 transition-all cursor-pointer"
            >
              Tháng hiện tại
            </button>

            {/* Year switch buttons */}
            <div className="flex items-center gap-2 border border-white/10 rounded-xl p-1 bg-[#090b14]">
              <button 
                onClick={() => setChartYear(y => y - 1)} 
                className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Năm trước"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-black px-1.5 text-indigo-300">{chartYear}</span>
              <button 
                onClick={() => setChartYear(y => y + 1)} 
                className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Năm sau"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 12 Month Grid Selector */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const mStr = `${chartYear}-${String(m).padStart(2, '0')}`;
            const isSelected = chartSelectedMonths.includes(mStr);
            return (
              <button
                key={m}
                onClick={() => toggleChartMonth(mStr)}
                className={`py-2.5 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#6440f6] to-[#4b25e3] text-white shadow-[0_0_16px_rgba(92,54,245,0.5)] border border-indigo-400/50 scale-[1.02]'
                    : 'bg-[#0a0d17] text-slate-400 hover:bg-white/[0.06] hover:text-white border border-white/5'
                }`}
              >
                Thg {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Analytical Workstation Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 text-left">
        
        {/* Left 2/3 Column: High-End Curvy SVG Chart */}
        <div className="xl:col-span-2 calendar-container-depth p-6 bg-[#111422] flex flex-col justify-between space-y-4">
          
          <div className="flex items-center justify-between border-b border-white/5 pb-3 select-none">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                <BarChart3 className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Xu Hướng Dòng Tiền Thu & Chi</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Trực quan hóa biến động thặng dư qua các giai đoạn</p>
              </div>
            </div>

            {/* Chart Legend Badges */}
            <div className="flex items-center gap-4 text-[11px] font-extrabold">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <span className="text-slate-300">Thu nhập</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                <span className="text-slate-300">Chi tiêu</span>
              </div>
            </div>
          </div>

          {/* SVG Visual Canvas */}
          <div className="w-full overflow-x-auto scrollbar-thin relative py-2">
            {chartSelectedMonths.length === 0 ? (
              <div className="h-[230px] flex items-center justify-center text-xs text-slate-500 font-bold bg-[#0b0e18] rounded-2xl border border-white/5">
                Vui lòng nhấp chọn ít nhất một tháng ở bộ lọc để hiển thị biểu đồ.
              </div>
            ) : (
              <div className="relative">
                <svg className="w-full min-w-[540px] h-[230px]" viewBox="0 0 600 200">
                  <defs>
                    <linearGradient id="dashboardIncomeArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="dashboardExpenseArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guidelines */}
                  {[25, 65, 105, 145].map((y, idx) => (
                    <line
                      key={idx}
                      x1="65"
                      y1={y}
                      x2="575"
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeDasharray="4 4"
                    />
                  ))}

                  {/* Y-Axis Value Labels */}
                  {[maxVal, maxVal * 0.66, maxVal * 0.33, 0].map((val, idx) => {
                    const yPoints = [25, 65, 105, 145];
                    return (
                      <text
                        key={idx}
                        x="55"
                        y={yPoints[idx] + 3.5}
                        fill="#64748b"
                        fontSize="9"
                        fontWeight="800"
                        textAnchor="end"
                      >
                        {val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : formatVND(val)}
                      </text>
                    );
                  })}

                  {/* Paths & Area Rendering */}
                  {incomePts.length > 0 && (
                    <>
                      {/* Area Fill */}
                      <path d={getAreaPath(incomePts)} fill="url(#dashboardIncomeArea)" className="pointer-events-none" />
                      <path d={getAreaPath(expensePts)} fill="url(#dashboardExpenseArea)" className="pointer-events-none" />

                      {/* Smooth Curves */}
                      <path
                        d={getCurvyPath(incomePts)}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.5))' }}
                      />
                      <path
                        d={getCurvyPath(expensePts)}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3"
                        strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' }}
                      />

                      {/* Hover Data Points */}
                      {incomePts.map((pt, idx) => (
                        <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPointIndex(idx)} onMouseLeave={() => setHoveredPointIndex(null)}>
                          {/* Income Point */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredPointIndex === idx ? "6" : "4.5"}
                            fill="#10b981"
                            stroke="#0b0e18"
                            strokeWidth="2"
                            className="transition-all duration-200"
                          />
                          {/* Expense Point */}
                          <circle
                            cx={expensePts[idx].x}
                            cy={expensePts[idx].y}
                            r={hoveredPointIndex === idx ? "6" : "4.5"}
                            fill="#ef4444"
                            stroke="#0b0e18"
                            strokeWidth="2"
                            className="transition-all duration-200"
                          />
                        </g>
                      ))}
                    </>
                  )}

                  {/* Horizontal Bottom Base Line */}
                  <line x1="65" y1="145" x2="575" y2="145" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" />

                  {/* X-Axis Labels */}
                  {lineData.map((d, idx) => {
                    const x = N > 1 ? 85 + idx * (500 / (N - 1)) : 85;
                    return (
                      <text
                        key={idx}
                        x={x}
                        y="170"
                        fill={hoveredPointIndex === idx ? "#ffffff" : "#94a3b8"}
                        fontSize="10"
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        {d.label}
                      </text>
                    );
                  })}
                </svg>

                {/* Hover Tooltip card over SVG */}
                {hoveredPointIndex !== null && lineData[hoveredPointIndex] && (
                  <div className="absolute top-2 right-4 bg-[#0d101d]/95 border border-indigo-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-xl animate-mac-dropdown text-xs space-y-1 z-20 pointer-events-none">
                    <span className="font-black text-indigo-300 block border-b border-white/5 pb-1">
                      {lineData[hoveredPointIndex].label}
                    </span>
                    <div className="flex items-center justify-between gap-4 pt-1">
                      <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                        Thu: {formatVND(lineData[hoveredPointIndex].income)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-rose-400 font-extrabold flex items-center gap-1">
                        Chi: {formatVND(lineData[hoveredPointIndex].expense)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Metrics Bar below chart */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-[#0b0e18] border border-white/5 p-3 rounded-2xl space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">THẶNG DƯ TRUNG BÌNH</span>
              <span className="text-sm font-black text-white block">
                {chartSelectedMonths.length > 0 ? formatVND(Math.round(net / chartSelectedMonths.length)) : '0 đ'}
              </span>
            </div>

            <div className="bg-[#0b0e18] border border-white/5 p-3 rounded-2xl space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">TỈ LỆ GIỮ LẠI</span>
              <span className="text-sm font-black text-emerald-400 block">
                {income > 0 ? `${Math.max(0, savingsMargin)}%` : '0%'}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-[#0b0e18] border border-white/5 p-3 rounded-2xl space-y-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">TRẠNG THÁI NGÂN SÁCH</span>
              <span className={`text-sm font-black block ${isOverBudget ? 'text-rose-400' : 'text-cyan-400'}`}>
                {isOverBudget ? 'Vượt hạn mức' : 'Trong tầm kiểm soát'}
              </span>
            </div>
          </div>
        </div>

        {/* Right 1/3 Column: Financial Hub Widgets */}
        <div className="space-y-6">
          
          {/* Donut Chart Widget */}
          <div className="calendar-container-depth p-5 bg-[#111422] space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  <PieChartIcon className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Phân Bổ Chi Tiêu Danh Mục</h3>
              </div>
            </div>

            {totalSelectedExp === 0 ? (
              <div className="py-7 text-center text-xs text-slate-500 font-extrabold bg-[#0b0e18] rounded-2xl border border-white/5">
                Chưa phát sinh chi tiêu trong khoảng thời gian này.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* SVG Donut Circle */}
                <div className="relative shrink-0 w-28 h-28">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                    
                    {slices.map((s, idx) => (
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
                        strokeLinecap={slices.length > 1 ? 'butt' : 'round'}
                        className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase leading-none">Chi tiêu</span>
                    <span className="text-xs font-black text-white leading-none mt-1 truncate max-w-[80px]" title={formatVND(totalSelectedExp)}>
                      {totalSelectedExp >= 1000000 ? `${(totalSelectedExp / 1000000).toFixed(1)}M` : formatVND(totalSelectedExp)}
                    </span>
                  </div>
                </div>

                {/* Categories List Legend */}
                <div className="flex-1 space-y-2 w-full">
                  {slices.slice(0, 4).map((s, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-slate-300 truncate">{s.name}</span>
                        </div>
                        <span className="text-white font-black shrink-0 ml-1">{s.pct}%</span>
                      </div>
                      <div className="h-1 bg-[#0b0e18] rounded-full overflow-hidden w-full">
                        <div className="h-full transition-all duration-300" style={{ width: `${s.pct}%`, backgroundColor: s.color }}></div>
                      </div>
                    </div>
                  ))}
                  {slices.length > 4 && (
                    <div className="text-[9px] font-black text-slate-400 text-right pt-0.5">
                      + {slices.length - 4} danh mục khác
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Budget Limit Tracker */}
          <div className="calendar-container-depth p-5 bg-[#111422] space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  {isOverBudget ? <AlertCircle className="h-3.5 w-3.5 text-rose-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                </div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Hạn Mức Ngân Sách Tổng</h3>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isOverBudget ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                {budgetPercent}%
              </span>
            </div>

            <div className="bg-[#0b0e18] border border-white/5 rounded-2xl p-4 space-y-2.5">
              <div className="flex justify-between text-xs font-bold items-center">
                <span className="text-slate-400">Tiến độ chi tiêu</span>
                <span className={isOverBudget ? 'text-rose-400 font-black' : 'text-emerald-400 font-bold'}>
                  {isOverBudget ? 'Vượt hạn mức chi!' : 'Trong phạm vi cho phép'}
                </span>
              </div>

              <div className="h-2.5 bg-[#121626] rounded-full overflow-hidden p-[1px] border border-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_10px_rgba(239,68,68,0.7)]' : 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 shadow-[0_0_10px_rgba(92,54,245,0.7)]'}`}
                  style={{ width: `${budgetPercent}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-[10px] font-extrabold text-slate-400 pt-0.5">
                <span>Đã chi: {formatVND(expense)}</span>
                <span>Ngân sách: {formatVND(totalExpBudget)}</span>
              </div>
            </div>
          </div>

          {/* Savings Progress Snapshot Widget (with MaterialSymbol finance_mode for Quỹ Tích Lũy) */}
          <div className="calendar-container-depth p-5 space-y-4 bg-[#111422]">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <MaterialSymbol icon="finance_mode" size={18} className="text-cyan-400" />
                </div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Tiến Độ Tích Lũy Tiết Kiệm</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              {/* Quỹ Dự Phòng Card */}
              <div className="bg-[#0b0e18] border border-emerald-500/25 p-3.5 rounded-2xl space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-400 uppercase truncate">Quỹ Dự Phòng</span>
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <span className="text-sm font-black text-white block truncate">{formatVND(emergencyCurrent)}</span>
                <span className="text-[9px] font-bold text-slate-400 block">Khẩn cấp</span>
              </div>

              {/* Quỹ Tích Lũy Card with MaterialSymbol finance_mode */}
              <div className="bg-[#0b0e18] border border-cyan-500/25 p-3.5 rounded-2xl space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-cyan-400 uppercase truncate">Quỹ Tích Lũy</span>
                  <MaterialSymbol icon="finance_mode" size={16} className="text-cyan-400" />
                </div>
                <span className="text-sm font-black text-white block truncate">{formatVND(accumulationCurrent)}</span>
                <span className="text-[9px] font-bold text-slate-400 block">Đầu tư dài hạn</span>
              </div>
            </div>

            <button 
              onClick={() => setActiveTab('saving')} 
              className="w-full py-2.5 bg-[#0a0d18] hover:bg-indigo-500/20 border border-indigo-500/30 hover:border-indigo-400 text-indigo-300 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Xem chi tiết tích lũy</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-indigo-400" />
            </button>
          </div>

          {/* Recent Activity Stream Streamed on Dashboard */}
          {recentTransactions.length > 0 && (
            <div className="calendar-container-depth p-5 bg-[#111422] space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Giao Dịch Gần Đây</h3>
                </div>
                <button 
                  onClick={() => setActiveTab('flow')}
                  className="text-[10px] font-bold text-indigo-400 hover:underline cursor-pointer"
                >
                  Tất cả
                </button>
              </div>

              <div className="space-y-2">
                {recentTransactions.map(t => {
                  const isInc = t.type === 'income';
                  return (
                    <div key={t.id} className="p-2.5 bg-[#0b0e18] border border-white/5 rounded-xl flex items-center justify-between text-left text-xs">
                      <div className="min-w-0 pr-2">
                        <span className="font-extrabold text-white truncate block">{t.desc}</span>
                        <span className="text-[9px] font-bold text-slate-500">{formatDateVN(t.date)} • {t.category}</span>
                      </div>
                      <span className={`font-black shrink-0 ${isInc ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isInc ? '+' : '-'}{formatVND(t.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}

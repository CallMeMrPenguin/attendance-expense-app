import React, { useState } from 'react';
import { 
  Plus, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  ArrowUpRight,
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

  // Helper for trend line graph data
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

  // Curvy SVG path calculations (Taller 320px SVG Canvas for Grand Amplitude)
  const lineData = getLineData();
  const maxVal = Math.max(1000000, ...lineData.flatMap(d => [d.income, d.expense]));
  const N = lineData.length;

  // SVG Y mapping (Y base=260, max altitude Y=35)
  const incomePts = lineData.map((d, idx) => {
    const x = N > 1 ? 95 + idx * (570 / (N - 1)) : 95;
    const y = 260 - (d.income / maxVal) * 225;
    return { x, y };
  });

  const expensePts = lineData.map((d, idx) => {
    const x = N > 1 ? 95 + idx * (570 / (N - 1)) : 95;
    const y = 260 - (d.expense / maxVal) * 225;
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
    return `${linePath} L ${pts[pts.length - 1].x} 260 L ${pts[0].x} 260 Z`;
  };

  // Donut Chart Expense Categories
  const expenseCatsList = ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'];
  const expenseTotals = expenseCatsList.map(cat => ({
    name: cat,
    value: getActualCategoryAmount(cat)
  }));
  const totalSelectedExp = getSelectedMonthsExpense();
  const C = 314.16; // 2 * pi * r (r=50)

  const expenseColorsMap: Record<string, string> = {
    'Ăn uống': '#f59e0b',
    'Di chuyển': '#3b82f6',
    'Shopping': '#ec4899',
    'Hóa đơn': '#a855f7',
    'Giải trí': '#f43f5e',
    'Khác': '#64748b'
  };

  let accExpDash = 0;
  const expenseSlices = expenseTotals
    .filter(e => e.value > 0)
    .map(e => {
      const pct = (e.value / totalSelectedExp) * 100;
      const len = (e.value / totalSelectedExp) * C;
      const offset = accExpDash;
      accExpDash += len;
      return {
        name: e.name,
        value: e.value,
        pct: Math.round(pct),
        color: expenseColorsMap[e.name] || '#64748b',
        dashArray: `${len} ${C}`,
        dashOffset: -offset
      };
    });

  // Donut Chart Income Categories
  const incomeCatsList = ['Lương', 'Giáo dục', 'Đầu tư', 'Khác'];
  const incomeTotals = incomeCatsList.map(cat => ({
    name: cat,
    value: getActualCategoryAmount(cat)
  }));
  const totalSelectedInc = getSelectedMonthsIncome();

  const incomeColorsMap: Record<string, string> = {
    'Lương': '#10b981',
    'Giáo dục': '#06b6d4',
    'Đầu tư': '#8b5cf6',
    'Khác': '#f59e0b'
  };

  let accIncDash = 0;
  const incomeSlices = incomeTotals
    .filter(e => e.value > 0)
    .map(e => {
      const pct = (e.value / totalSelectedInc) * 100;
      const len = (e.value / totalSelectedInc) * C;
      const offset = accIncDash;
      accIncDash += len;
      return {
        name: e.name,
        value: e.value,
        pct: Math.round(pct),
        color: incomeColorsMap[e.name] || '#10b981',
        dashArray: `${len} ${C}`,
        dashOffset: -offset
      };
    });

  // Savings Distribution Donut (Quỹ Dự Phòng vs Quỹ Tích Lũy)
  const totalSavings = emergencyCurrent + accumulationCurrent;
  const emShare = totalSavings > 0 ? Math.round((emergencyCurrent / totalSavings) * 100) : 50;
  const acShare = totalSavings > 0 ? 100 - emShare : 50;
  const emLen = totalSavings > 0 ? (emergencyCurrent / totalSavings) * C : C / 2;

  // Budget vs Actual tracker variables
  const M = chartSelectedMonths.length;
  const totalExpBudget = Object.keys(categoryBudgets)
    .filter(c => ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'].includes(c))
    .reduce((sum, c) => sum + (categoryBudgets[c] || 0), 0) * M;

  const budgetPercent = totalExpBudget > 0 ? Math.min(100, Math.round((expense / totalExpBudget) * 100)) : 0;
  const isOverBudget = expense > totalExpBudget;

  // Recent transactions preview
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
      
      {/* 4 Glowing Metric Summary Cards (Without ArrowUpRight & ArrowDownRight icons next to subtext) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 text-left">
        
        {/* Card 1: Cumulative Net Worth */}
        <div className="kpi-card-purple p-6 flex flex-col justify-between min-h-[145px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
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

        {/* Card 2: Income for Selected Period (Icon next to subtext removed) */}
        <div className="kpi-card-green p-6 flex flex-col justify-between min-h-[145px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-emerald-400 text-glow-green uppercase tracking-widest block">
                Thu nhập
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
            <span>Thu về từ các nguồn</span>
            <span className="bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
              Tháng đã chọn
            </span>
          </div>
        </div>

        {/* Card 3: Expenses for Selected Period (Icon next to subtext removed) */}
        <div className="kpi-card-red p-6 flex flex-col justify-between min-h-[145px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-rose-400 text-glow-red uppercase tracking-widest block">
                Chi tiêu
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
            <span>{totalExpBudget > 0 ? `${budgetPercent}% ngân sách` : 'Chi phí phát sinh'}</span>
            <span className="bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
              {isOverBudget ? 'Vượt hạn mức' : 'Tháng đã chọn'}
            </span>
          </div>
        </div>

        {/* Card 4: Net Surplus (Thu - Chi) with MaterialSymbol currency_exchange */}
        <div className="kpi-card-blue p-6 flex flex-col justify-between min-h-[145px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-cyan-400 text-glow-blue uppercase tracking-widest block">
                Net (Thu - Chi)
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
              Thặng dư ròng
            </span>
          </div>
        </div>

      </div>

      {/* Multi-Month Selector Filter Bar */}
      <div className="calendar-container-depth p-4 bg-[#111422] text-left">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3.5 select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-wider">Bộ Lọc Xem Biểu Đồ (Chọn Nhiều Tháng)</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Tự động đồng bộ tất cả biểu đồ báo cáo bên dưới</p>
            </div>
          </div>

          {/* Year Switcher */}
          <div className="flex items-center gap-2 border border-white/10 rounded-xl p-1 bg-[#090b14]">
            <button 
              onClick={() => setChartYear(y => y - 1)} 
              className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Năm trước"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-black px-2 text-indigo-300">{chartYear}</span>
            <button 
              onClick={() => setChartYear(y => y + 1)} 
              className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Năm sau"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
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
                T.{m}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- SECTION 1: Grand Prominent Trend Graph (Enlarged 320px SVG Canvas) --- */}
      <div className="calendar-container-depth p-6 bg-[#111422] flex flex-col justify-between space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-white/5 pb-3 select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Xu Hướng Thu Nhập & Chi Tiêu</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Biểu đồ đường cong Bézier đối chiếu thu chi theo thời gian</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-extrabold">
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

        {/* SVG Visual Canvas (Enlarged 320px Height for Taller Amplitude) */}
        <div className="w-full overflow-x-auto scrollbar-thin relative py-2">
          {chartSelectedMonths.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-xs text-slate-500 font-bold bg-[#0b0e18] rounded-2xl border border-white/5">
              Vui lòng chọn ít nhất một tháng từ bộ lọc ở trên.
            </div>
          ) : (
            <div className="relative">
              <svg className="w-full min-w-[650px] h-[300px]" viewBox="0 0 700 300">
                <defs>
                  <linearGradient id="dashboardIncomeArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="dashboardExpenseArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Dotted Lines */}
                {[35, 110, 185, 260].map((y, idx) => (
                  <line
                    key={idx}
                    x1="75"
                    y1={y}
                    x2="675"
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeDasharray="5 5"
                  />
                ))}

                {/* Y-Axis Value Labels */}
                {[maxVal, maxVal * 0.66, maxVal * 0.33, 0].map((val, idx) => {
                  const yPoints = [35, 110, 185, 260];
                  return (
                    <text
                      key={idx}
                      x="65"
                      y={yPoints[idx] + 4}
                      fill="#64748b"
                      fontSize="10"
                      fontWeight="800"
                      textAnchor="end"
                    >
                      {val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : formatVND(val)}
                    </text>
                  );
                })}

                {/* Paths & Area Fill Rendering */}
                {incomePts.length > 0 && (
                  <>
                    <path d={getAreaPath(incomePts)} fill="url(#dashboardIncomeArea)" className="pointer-events-none" />
                    <path d={getAreaPath(expensePts)} fill="url(#dashboardExpenseArea)" className="pointer-events-none" />

                    <path
                      d={getCurvyPath(incomePts)}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.6))' }}
                    />
                    <path
                      d={getCurvyPath(expensePts)}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.6))' }}
                    />

                    {/* Interactive Data Nodes */}
                    {incomePts.map((pt, idx) => (
                      <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPointIndex(idx)} onMouseLeave={() => setHoveredPointIndex(null)}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredPointIndex === idx ? "7" : "5"}
                          fill="#10b981"
                          stroke="#0b0e18"
                          strokeWidth="2.5"
                          className="transition-all duration-200"
                        />
                        <circle
                          cx={expensePts[idx].x}
                          cy={expensePts[idx].y}
                          r={hoveredPointIndex === idx ? "7" : "5"}
                          fill="#ef4444"
                          stroke="#0b0e18"
                          strokeWidth="2.5"
                          className="transition-all duration-200"
                        />
                      </g>
                    ))}
                  </>
                )}

                {/* Horizontal Baseline */}
                <line x1="75" y1="260" x2="675" y2="260" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />

                {/* X-Axis Labels */}
                {lineData.map((d, idx) => {
                  const x = N > 1 ? 95 + idx * (570 / (N - 1)) : 95;
                  return (
                    <text
                      key={idx}
                      x={x}
                      y="285"
                      fill={hoveredPointIndex === idx ? "#ffffff" : "#94a3b8"}
                      fontSize="11"
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
                <div className="absolute top-4 right-6 bg-[#0d101d]/95 border border-indigo-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl animate-mac-dropdown text-xs space-y-1.5 z-20 pointer-events-none">
                  <span className="font-black text-indigo-300 block border-b border-white/5 pb-1">
                    {lineData[hoveredPointIndex].label}
                  </span>
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <span className="text-emerald-400 font-extrabold">Thu nhập: {formatVND(lineData[hoveredPointIndex].income)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-rose-400 font-extrabold">Chi tiêu: {formatVND(lineData[hoveredPointIndex].expense)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- SECTION 2: Income & Expense Distribution Pie Charts Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        
        {/* Income Distribution Pie Chart */}
        <div className="calendar-container-depth p-5 bg-[#111422] space-y-4 rounded-3xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <PieChartIcon className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black text-emerald-400 text-glow-green uppercase tracking-wider">Phân Bổ Thu Nhập (Dòng Tiền)</h3>
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Tổng: {formatVND(totalSelectedInc)}
            </span>
          </div>

          {totalSelectedInc === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-extrabold bg-[#0b0e18] rounded-2xl border border-white/5">
              Không có thu nhập trong tháng đã chọn.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative shrink-0 w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
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
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-extrabold text-emerald-400 uppercase leading-none">Thu Nhập</span>
                  <span className="text-xs font-black text-white leading-none mt-1 truncate max-w-[85px]" title={formatVND(totalSelectedInc)}>
                    {totalSelectedInc >= 1000000 ? `${(totalSelectedInc / 1000000).toFixed(1)}M` : formatVND(totalSelectedInc)}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2 w-full">
                {incomeSlices.map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-slate-200 truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 text-[10px] font-semibold">{formatVND(s.value)}</span>
                        <span className="text-white font-black">{s.pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#0b0e18] rounded-full overflow-hidden w-full">
                      <div className="h-full transition-all duration-300" style={{ width: `${s.pct}%`, backgroundColor: s.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expense Distribution Pie Chart */}
        <div className="calendar-container-depth p-5 bg-[#111422] space-y-4 rounded-3xl border border-rose-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <PieChartIcon className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black text-rose-400 text-glow-red uppercase tracking-wider">Phân Bổ Chi Tiêu (Dòng Tiền)</h3>
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
              Tổng: {formatVND(totalSelectedExp)}
            </span>
          </div>

          {totalSelectedExp === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-extrabold bg-[#0b0e18] rounded-2xl border border-white/5">
              Không có chi tiêu trong tháng đã chọn.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative shrink-0 w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
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
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-extrabold text-rose-400 uppercase leading-none">Chi Tiêu</span>
                  <span className="text-xs font-black text-white leading-none mt-1 truncate max-w-[85px]" title={formatVND(totalSelectedExp)}>
                    {totalSelectedExp >= 1000000 ? `${(totalSelectedExp / 1000000).toFixed(1)}M` : formatVND(totalSelectedExp)}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2 w-full">
                {expenseSlices.map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-slate-200 truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 text-[10px] font-semibold">{formatVND(s.value)}</span>
                        <span className="text-white font-black">{s.pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#0b0e18] rounded-full overflow-hidden w-full">
                      <div className="h-full transition-all duration-300" style={{ width: `${s.pct}%`, backgroundColor: s.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* --- SECTION 3: Savings Ratio Donut & Budget Limit Gauges Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        
        {/* Savings & Accumulation Allocation Ring (from SavingTab) */}
        <div className="calendar-container-depth p-5 bg-[#111422] space-y-4 rounded-3xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <MaterialSymbol icon="finance_mode" size={18} className="text-cyan-400" />
              </div>
              <h3 className="text-xs font-black text-cyan-400 text-glow-blue uppercase tracking-wider">Phân Bổ Tỉ Lệ Tích Lũy Tiết Kiệm</h3>
            </div>
            <button
              onClick={() => setActiveTab('saving')}
              className="text-[10px] font-extrabold text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Xem chi tiết</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Donut Ring */}
            <div className="relative shrink-0 w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                {/* Segment 1: Quỹ Dự Phòng (Green) */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={`${emLen} ${C}`}
                  strokeDashoffset={0}
                  className="transition-all duration-500"
                />
                {/* Segment 2: Quỹ Tích Lũy (Cyan) */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  stroke="#06b6d4"
                  strokeWidth="12"
                  strokeDasharray={`${C - emLen} ${C}`}
                  strokeDashoffset={-emLen}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-black text-white leading-none">{emShare}% / {acShare}%</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-1">Dự phòng / Tích lũy</span>
              </div>
            </div>

            {/* Legend Cards */}
            <div className="flex-1 space-y-2.5 w-full">
              <div className="bg-[#0b0e18] border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] font-black text-emerald-300 uppercase block leading-none">Quỹ Dự Phòng</span>
                    <span className="text-xs font-black text-white block mt-1">{formatVND(emergencyCurrent)}</span>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">{emShare}%</span>
              </div>

              <div className="bg-[#0b0e18] border border-cyan-500/30 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <MaterialSymbol icon="finance_mode" size={18} className="text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-[10px] font-black text-cyan-300 uppercase block leading-none">Quỹ Tích Lũy</span>
                    <span className="text-xs font-black text-white block mt-1">{formatVND(accumulationCurrent)}</span>
                  </div>
                </div>
                <span className="text-xs font-black text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded-md">{acShare}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Allocation Gauge */}
        <div className="calendar-container-depth p-5 bg-[#111422] space-y-3 rounded-3xl border border-indigo-500/30 shadow-[0_0_20px_rgba(92,54,245,0.15)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                {isOverBudget ? <AlertCircle className="h-4 w-4 text-rose-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              </div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Hạn Mức Ngân Sách Tổng</h3>
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${isOverBudget ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
              {budgetPercent}%
            </span>
          </div>

          <div className="bg-[#0b0e18] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between text-xs font-bold items-center">
              <span className="text-slate-400">Tiến độ sử dụng ngân sách</span>
              <span className={isOverBudget ? 'text-rose-400 font-black' : 'text-emerald-400 font-bold'}>
                {isOverBudget ? 'Vượt hạn mức chi!' : 'Trong phạm vi an toàn'}
              </span>
            </div>

            <div className="h-3 bg-[#121626] rounded-full overflow-hidden p-[1px] border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_10px_rgba(239,68,68,0.7)]' : 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 shadow-[0_0_10px_rgba(92,54,245,0.7)]'}`}
                style={{ width: `${budgetPercent}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-[10px] font-extrabold text-slate-400 pt-0.5">
              <span>Đã chi: {formatVND(expense)}</span>
              <span>Tổng ngân sách: {formatVND(totalExpBudget)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* --- SECTION 4: Streamed Recent Activity Feed (Full Width) --- */}
      {recentTransactions.length > 0 && (
        <div className="calendar-container-depth p-5 bg-[#111422] space-y-3 text-left rounded-3xl border border-white/10">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                <Clock className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Giao Dịch Gần Đây</h3>
            </div>
            <button 
              onClick={() => setActiveTab('flow')}
              className="text-[10px] font-extrabold text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Xem tất cả giao dịch</span>
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentTransactions.map(t => {
              const isInc = t.type === 'income';
              return (
                <div key={t.id} className="p-3 bg-[#0b0e18] border border-white/5 hover:border-white/15 rounded-2xl flex items-center justify-between text-xs transition-all">
                  <div className="min-w-0 pr-2 space-y-0.5">
                    <span className="font-extrabold text-white truncate block">{t.desc}</span>
                    <span className="text-[9px] font-bold text-slate-500 block">{formatDateVN(t.date)} • {t.category}</span>
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
  );
}

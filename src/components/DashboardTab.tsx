import React from 'react';
import { 
  Sparkles, 
  Plus, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { formatVND, Session } from '@/lib/utils';

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

  const income = getSelectedMonthsIncome();
  const expense = getSelectedMonthsExpense();
  const net = income - expense;

  // Net worth cumulative calculation
  const totalIncomeAll = getTotalIncome();
  const totalExpenseAll = getTotalExpense();
  const walletCash = totalIncomeAll - totalExpenseAll;
  const savings = emergencyCurrent + accumulationCurrent;
  const netWorth = walletCash + savings;

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

  return (
    <div className="space-y-6 animate-mac-dropdown">
      
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-left relative z-10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-extrabold tracking-wider uppercase shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Tổng quan tài chính</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Xin chào, <span className="bg-gradient-to-r from-white via-indigo-150 to-purple-400 bg-clip-text text-transparent">{currentUser.teacherName}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-semibold pt-0.5">
            Quản lý hạn mức chi tiêu, danh mục tích lũy và thu nhập giảng dạy.
          </p>
        </div>

        <button
          onClick={() => handleOpenTxModal('expense')}
          className="flex items-center gap-2 px-4.5 py-2.5 bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-[0_4px_12px_rgba(92,54,245,0.35)] hover:scale-[1.02] transition-all cursor-pointer border border-white/20 select-none shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm giao dịch mới</span>
        </button>
      </div>

      {/* 4 Cards (Net Worth, Thu nhập, Chi tiêu, Net) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 text-left">
        {/* Card 1: Cumulative Net Worth */}
        <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Tổng tài sản</span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-sm shrink-0">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={formatVND(netWorth)}>
              {formatVND(netWorth)}
            </span>
          </div>
          <div className="mt-2 flex">
            <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-md">
              Ví + Tiết kiệm
            </span>
          </div>
        </div>

        {/* Card 2: Selected month(s) Incomes */}
        <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Thu nhập</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={formatVND(income)}>
              {formatVND(income)}
            </span>
          </div>
          <div className="mt-2 flex">
            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
              Tháng đã chọn
            </span>
          </div>
        </div>

        {/* Card 3: Selected month(s) Expenses */}
        <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Chi tiêu</span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-red-500 border border-rose-500/30 shadow-sm shrink-0">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg sm:text-2xl font-black text-white tracking-tight leading-none block truncate" title={formatVND(expense)}>
              {formatVND(expense)}
            </span>
          </div>
          <div className="mt-2 flex">
            <span className="text-[10px] font-extrabold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-md">
              Tháng đã chọn
            </span>
          </div>
        </div>

        {/* Card 4: Net income-expense */}
        <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Net (Thu - Chi)</span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm shrink-0">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-lg sm:text-2xl font-black tracking-tight leading-none block truncate ${net >= 0 ? 'text-white' : 'text-red-500'}`} title={formatVND(net)}>
              {formatVND(net)}
            </span>
          </div>
          <div className="mt-2 flex">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${net >= 0 ? 'text-cyan-400 bg-cyan-500/15' : 'text-rose-400 bg-rose-500/15'}`}>
              Thặng dư ròng
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Month Selector filter */}
      <div className="calendar-container-depth p-4 bg-[#141824] text-left">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 select-none">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-black uppercase text-white tracking-wider">Bộ lọc xem biểu đồ (Chọn nhiều tháng)</span>
          </div>

          {/* Year selector switch */}
          <div className="flex items-center gap-2 border border-white/10 rounded-xl p-1 bg-[#0d1018]">
            <button onClick={() => setChartYear(y=>y-1)} className="p-1 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronLeft className="h-3 w-3"/></button>
            <span className="text-xs font-extrabold px-1 text-white">{chartYear}</span>
            <button onClick={() => setChartYear(y=>y+1)} className="p-1 rounded-lg hover:bg-white/[0.05] text-slate-400 hover:text-white transition-colors cursor-pointer"><ChevronRight className="h-3 w-3"/></button>
          </div>
        </div>

        {/* 12 months buttons grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const mStr = `${chartYear}-${String(m).padStart(2, '0')}`;
            const isSelected = chartSelectedMonths.includes(mStr);
            return (
              <button
                key={m}
                onClick={() => toggleChartMonth(mStr)}
                className={`py-2 rounded-xl text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(92,54,245,0.45)] border border-indigo-500/20'
                    : 'bg-[#0d1018] text-slate-450 hover:bg-white/[0.05] hover:text-white border border-white/5'
                }`}
              >
                T.{m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main analytical displays */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Curvy line graph display */}
        <div className="xl:col-span-2 calendar-container-depth p-5 text-left bg-[#141824] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-5 select-none">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Xu hướng thu nhập & chi tiêu</h3>
            </div>
            <div className="flex items-center gap-3.5 text-[10px] font-extrabold">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-emerald-500 rounded-sm"></span>
                <span className="text-slate-450">Thu nhập</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-rose-500 rounded-sm"></span>
                <span className="text-slate-450">Chi tiêu</span>
              </div>
            </div>
          </div>

          {/* SVG Curvy Line chart */}
          <div className="w-full overflow-x-auto scrollbar-thin">
            {chartSelectedMonths.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-xs text-slate-500 font-bold">
                Vui lòng chọn ít nhất một tháng từ bộ lọc ở trên.
              </div>
            ) : (
              <svg className="w-full min-w-[500px] h-[200px]" viewBox="0 0 600 200">
                <defs>
                  <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="expenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal dotted lines */}
                {[25, 65, 105, 145].map((y, idx) => (
                  <line
                    key={idx}
                    x1="65"
                    y1={y}
                    x2="575"
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.04)"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Y-axis values */}
                {[maxVal, maxVal * 0.66, maxVal * 0.33, 0].map((val, idx) => {
                  const yPoints = [25, 65, 105, 145];
                  return (
                    <text
                      key={idx}
                      x="55"
                      y={yPoints[idx] + 3.5}
                      fill="#64748b"
                      fontSize="9"
                      fontWeight="750"
                      textAnchor="end"
                    >
                      {val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : formatVND(val)}
                    </text>
                  );
                })}

                {/* Curvy line paths */}
                {incomePts.length > 0 && (
                  <>
                    {/* Income area fill */}
                    <path d={getAreaPath(incomePts)} fill="url(#incomeAreaGrad)" className="pointer-events-none" />
                    {/* Expense area fill */}
                    <path d={getAreaPath(expensePts)} fill="url(#expenseAreaGrad)" className="pointer-events-none" />

                    {/* Income line */}
                    <path
                      d={getCurvyPath(incomePts)}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]"
                    />

                    {/* Expense line */}
                    <path
                      d={getCurvyPath(expensePts)}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_6px_rgba(239,68,68,0.3)]"
                    />

                    {/* Points circles highlight */}
                    {incomePts.map((pt, idx) => (
                      <g key={idx} className="group/dot">
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="4"
                          fill="#10b981"
                          stroke="#141824"
                          strokeWidth="1.5"
                          className="transition-all duration-200 hover:scale-150 cursor-pointer"
                        />
                        <circle
                          cx={expensePts[idx].x}
                          cy={expensePts[idx].y}
                          r="4"
                          fill="#ef4444"
                          stroke="#141824"
                          strokeWidth="1.5"
                          className="transition-all duration-200 hover:scale-150 cursor-pointer"
                        />
                      </g>
                    ))}
                  </>
                )}

                {/* Labels */}
                {lineData.map((d, idx) => {
                  const x = N > 1 ? 85 + idx * (500 / (N - 1)) : 85;
                  return (
                    <text
                      key={idx}
                      x={x}
                      y="168"
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {d.label}
                    </text>
                  );
                })}

                <line x1="65" y1="145" x2="575" y2="145" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
              </svg>
            )}
          </div>
        </div>

        {/* Right side: Category Donut & Budget vs Actual progress */}
        <div className="space-y-6 text-left">
          
          {/* Donut chart for expense distribution */}
          <div className="calendar-container-depth p-5 bg-[#141824] space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Phân bổ chi tiêu</h3>
            </div>

            {totalSelectedExp === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-bold">
                Không có chi tiêu phát sinh trong tháng đã chọn.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* SVG Donut */}
                <div className="relative shrink-0 w-28 h-28">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    {/* Base circle background */}
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
                        className="transition-all duration-300"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-extrabold text-slate-455 uppercase leading-none">Chi tiêu</span>
                    <span className="text-xs font-black text-white leading-none mt-1 truncate max-w-[80px]" title={formatVND(totalSelectedExp)}>
                      {totalSelectedExp >= 1000000 ? `${(totalSelectedExp / 1000000).toFixed(1)}M` : formatVND(totalSelectedExp)}
                    </span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="flex-1 space-y-1.5 w-full">
                  {slices.slice(0, 4).map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px] font-bold">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-slate-350 truncate">{s.name}</span>
                      </div>
                      <span className="text-white font-black shrink-0">{s.pct}%</span>
                    </div>
                  ))}
                  {slices.length > 4 && (
                    <div className="text-[9px] font-black text-slate-500 text-right">
                      + {slices.length - 4} danh mục khác
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Budget vs Actual progress overview */}
          <div className="calendar-container-depth p-5 bg-[#141824] space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Hạn mức ngân sách tổng hợp</h3>
            </div>

            <div className="bg-[#181d2e] border border-white/5 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs font-bold items-center">
                <span className="text-slate-350">Tổng ngân sách chi</span>
                <span className={isOverBudget ? 'text-red-500 font-black animate-pulse' : 'text-emerald-400'}>
                  {budgetPercent}% {isOverBudget && '(Vượt hạn mức!)'}
                </span>
              </div>
              <div className="h-2 bg-[#101420] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${isOverBudget ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-500'}`}
                  style={{ width: `${budgetPercent}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] font-extrabold text-slate-550">
                <span>Đã chi: {formatVND(expense)}</span>
                <span>Ngân sách: {formatVND(totalExpBudget)}</span>
              </div>
            </div>
          </div>

          {/* Savings Widget */}
          <div className="calendar-container-depth p-5 space-y-4 bg-[#141824]">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(92,54,245,0.7)]"></div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Tiến độ tích lũy tiết kiệm</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[10px] font-extrabold text-slate-550">
              <div className="bg-[#181d2e] border border-white/5 p-3.5 rounded-2xl space-y-1">
                <span className="text-slate-455 block truncate">Quỹ Dự Phòng</span>
                <span className="text-sm font-black text-white block truncate">{formatVND(emergencyCurrent)}</span>
              </div>
              <div className="bg-[#181d2e] border border-white/5 p-3.5 rounded-2xl space-y-1">
                <span className="text-slate-455 block truncate">Quỹ Tích Lũy</span>
                <span className="text-sm font-black text-white block truncate">{formatVND(accumulationCurrent)}</span>
              </div>
            </div>
            <button onClick={() => setActiveTab('saving')} className="w-full py-2 bg-[#0d1018] hover:bg-white/[0.04] border border-white/10 text-indigo-350 font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer text-center">
              Xem chi tiết tiết kiệm
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

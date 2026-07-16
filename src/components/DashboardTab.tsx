import React, { useState, useMemo, useRef } from 'react';
import { 
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
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw
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

// 24 Color Choices for up to 12 Pairs (Multi-month or Multi-year comparison)
const COLOR_PAIRS = [
  { income: '#10b981', expense: '#ef4444' }, // Month 1: Green / Red
  { income: '#06b6d4', expense: '#f59e0b' }, // Month 2: Cyan / Amber
  { income: '#a855f7', expense: '#ec4899' }, // Month 3: Purple / Pink
  { income: '#3b82f6', expense: '#f43f5e' }, // Month 4: Blue / Rose
  { income: '#34d399', expense: '#ff7849' }, // Month 5: Emerald / Orange
  { income: '#8b5cf6', expense: '#fb7185' }, // Month 6: Indigo / Coral
  { income: '#0ea5e9', expense: '#e11d48' }, // Month 7: Sky / Crimson
  { income: '#2dd4bf', expense: '#d97706' }, // Month 8: Teal / Gold
  { income: '#6366f1', expense: '#f43f5e' }, // Month 9: Violet / Magenta
  { income: '#14b8a6', expense: '#e11d48' }, // Month 10: Jade / Ruby
  { income: '#84cc16', expense: '#c084fc' }, // Month 11: Lime / Lavender
  { income: '#0284c7', expense: '#ff5252' }  // Month 12: DeepSky / BrightRed
];

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
  // 4 Viewing Modes: 'days' | 'weeks' | 'months' | 'years'
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months' | 'years'>('weeks');

  // Multi-Year selection support
  const [selectedYears, setSelectedYears] = useState<number[]>([chartYear]);

  // Precision Hover state
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState<{
    pointIndex: number;
    svgX: number;
    svgY: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

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

  // Helper for daily income calculation
  const getDailyIncome = (monthStr: string, day: number) => {
    const dayStr = `${monthStr}-${String(day).padStart(2, '0')}`;
    const manual = manualTransactions
      .filter(t => t.type === 'income' && t.date === dayStr)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const auto = sessions
      .filter(s => s.status === 'Đã dạy' && s.date === dayStr)
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    return manual + auto;
  };

  // Helper for daily expense calculation
  const getDailyExpense = (monthStr: string, day: number) => {
    const dayStr = `${monthStr}-${String(day).padStart(2, '0')}`;
    return manualTransactions
      .filter(t => t.type === 'expense' && t.date === dayStr)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  };

  // Days count helper
  const getDaysInMonth = (monthStr: string) => {
    if (!monthStr) return 30;
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  };

  // Toggle year selection in multi-year mode
  const toggleYearSelection = (yearNum: number) => {
    setChartYear(yearNum);
    setSelectedYears(prev => {
      if (prev.includes(yearNum)) {
        if (prev.length === 1) return prev;
        return prev.filter(y => y !== yearNum);
      }
      return [...prev, yearNum].sort((a, b) => a - b);
    });
  };

  // Zoom In / Zoom Out connected to View Mode switching
  const handleZoomIn = () => {
    if (viewMode === 'years') setViewMode('months');
    else if (viewMode === 'months') setViewMode('weeks');
    else if (viewMode === 'weeks') setViewMode('days');
  };

  const handleZoomOut = () => {
    if (viewMode === 'days') setViewMode('weeks');
    else if (viewMode === 'weeks') setViewMode('months');
    else if (viewMode === 'months') setViewMode('years');
  };

  // Flexible Multi-Line Data Model based on 4 View Modes
  const chartDataModel = useMemo(() => {
    const activeMonth = chartSelectedMonths[0] || `${chartYear}-07`;

    // 1. Theo Năm Mode ('years')
    if (viewMode === 'years') {
      const xLabels = selectedYears.map(y => `Năm ${y}`);
      const points = selectedYears.map(yr => {
        let totalInc = 0;
        let totalExp = 0;
        for (let m = 1; m <= 12; m++) {
          const mStr = `${yr}-${String(m).padStart(2, '0')}`;
          totalInc += getMonthlyIncome(mStr);
          totalExp += getMonthlyExpense(mStr);
        }
        return { label: `Năm ${yr}`, income: totalInc, expense: totalExp };
      });
      const maxVal = Math.max(1000000, ...points.flatMap(p => [p.income, p.expense]));
      return {
        xLabels,
        maxVal,
        series: [
          {
            title: `Tổng Quan Các Năm`,
            colorIndex: 0,
            incomeColor: COLOR_PAIRS[0].income,
            expenseColor: COLOR_PAIRS[0].expense,
            points
          }
        ]
      };
    }

    // 2. Theo Tháng Mode ('months')
    if (viewMode === 'months') {
      const xLabels = ['Th.1', 'Th.2', 'Th.3', 'Th.4', 'Th.5', 'Th.6', 'Th.7', 'Th.8', 'Th.9', 'Th.10', 'Th.11', 'Th.12'];
      const seriesList = selectedYears.map((yr, yIdx) => {
        const colors = COLOR_PAIRS[yIdx % COLOR_PAIRS.length];
        const points = Array.from({ length: 12 }, (_, mIdx) => {
          const mStr = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
          return {
            label: `Th.${mIdx + 1}/${yr}`,
            income: getMonthlyIncome(mStr),
            expense: getMonthlyExpense(mStr)
          };
        });

        return {
          title: `Năm ${yr}`,
          colorIndex: yIdx,
          incomeColor: colors.income,
          expenseColor: colors.expense,
          points
        };
      });

      const maxVal = Math.max(1000000, ...seriesList.flatMap(s => s.points.flatMap(p => [p.income, p.expense])));
      return {
        xLabels,
        maxVal,
        series: seriesList
      };
    }

    // 3. Theo Ngày Mode ('days')
    if (viewMode === 'days') {
      const numDays = getDaysInMonth(activeMonth);
      const [yStr, mStr] = activeMonth.split('-');
      const xLabels = Array.from({ length: numDays }, (_, i) => `N.${i + 1}`);
      const points = Array.from({ length: numDays }, (_, i) => {
        const d = i + 1;
        return {
          label: `Ng. ${d}/${mStr}/${yStr}`,
          income: getDailyIncome(activeMonth, d),
          expense: getDailyExpense(activeMonth, d)
        };
      });

      const maxVal = Math.max(1000000, ...points.flatMap(p => [p.income, p.expense]));
      return {
        xLabels,
        maxVal,
        series: [
          {
            title: `Th.${Number(mStr)}/${yStr.substring(2)} (Hàng Ngày)`,
            colorIndex: 0,
            incomeColor: COLOR_PAIRS[0].income,
            expenseColor: COLOR_PAIRS[0].expense,
            points
          }
        ]
      };
    }

    // 4. Theo Tuần Mode ('weeks') - Default
    if (chartSelectedMonths.length > 1) {
      const xLabels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
      const seriesList = chartSelectedMonths.map((m, idx) => {
        const [yStr, mStr] = m.split('-');
        const colors = COLOR_PAIRS[idx % COLOR_PAIRS.length];
        const points = [
          { label: 'Tuần 1', income: getWeeklyIncome(m, 1, 7), expense: getWeeklyExpense(m, 1, 7) },
          { label: 'Tuần 2', income: getWeeklyIncome(m, 8, 14), expense: getWeeklyExpense(m, 8, 14) },
          { label: 'Tuần 3', income: getWeeklyIncome(m, 15, 21), expense: getWeeklyExpense(m, 15, 21) },
          { label: 'Tuần 4', income: getWeeklyIncome(m, 22, 31), expense: getWeeklyExpense(m, 22, 31) }
        ];

        return {
          title: `Th.${Number(mStr)}/${yStr.substring(2)}`,
          colorIndex: idx,
          incomeColor: colors.income,
          expenseColor: colors.expense,
          points
        };
      });

      const maxVal = Math.max(1000000, ...seriesList.flatMap(s => s.points.flatMap(p => [p.income, p.expense])));
      return {
        xLabels,
        maxVal,
        series: seriesList
      };
    } else {
      const [yStr, mStr] = activeMonth.split('-');
      const xLabels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
      const points = [
        { label: 'Tuần 1', income: getWeeklyIncome(activeMonth, 1, 7), expense: getWeeklyExpense(activeMonth, 1, 7) },
        { label: 'Tuần 2', income: getWeeklyIncome(activeMonth, 8, 14), expense: getWeeklyExpense(activeMonth, 8, 14) },
        { label: 'Tuần 3', income: getWeeklyIncome(activeMonth, 15, 21), expense: getWeeklyExpense(activeMonth, 15, 21) },
        { label: 'Tuần 4', income: getWeeklyIncome(activeMonth, 22, 31), expense: getWeeklyExpense(activeMonth, 22, 31) }
      ];

      const maxVal = Math.max(1000000, ...points.flatMap(p => [p.income, p.expense]));
      return {
        xLabels,
        maxVal,
        series: [
          {
            title: `Th.${Number(mStr)}/${yStr.substring(2)}`,
            colorIndex: 0,
            incomeColor: COLOR_PAIRS[0].income,
            expenseColor: COLOR_PAIRS[0].expense,
            points
          }
        ]
      };
    }
  }, [viewMode, selectedYears, chartSelectedMonths, chartYear, manualTransactions, sessions, getMonthlyIncome, getMonthlyExpense, getWeeklyIncome, getWeeklyExpense]);

  // Extended SVG Dimensions (900 x 420 for long, tall graph)
  const SVG_WIDTH = 900;
  const SVG_HEIGHT = 420;
  const MARGIN_LEFT = 25;
  const MARGIN_RIGHT = 875;
  const BASE_Y = 370;
  const TOP_Y = 30;

  const numXPoints = chartDataModel.xLabels.length;

  const getXCoordinate = (pointIndex: number) => {
    if (numXPoints <= 1) return MARGIN_LEFT;
    return MARGIN_LEFT + pointIndex * ((MARGIN_RIGHT - MARGIN_LEFT) / (numXPoints - 1));
  };

  const getYCoordinate = (val: number, maxVal: number) => {
    return BASE_Y - (val / Math.max(1, maxVal)) * (BASE_Y - TOP_Y);
  };

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
    return `${linePath} L ${pts[pts.length - 1].x} ${BASE_Y} L ${pts[0].x} ${BASE_Y} Z`;
  };

  // Precision Mouse Move Handler: Only shows tooltip when hovering within 30px proximity of actual line node
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || numXPoints === 0 || chartDataModel.series.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
    const mouseY = ((e.clientY - rect.top) / rect.height) * SVG_HEIGHT;

    let minDistance = Infinity;
    let closestIndex = -1;
    let closestPtX = 0;
    let closestPtY = 0;

    chartDataModel.series.forEach(seriesItem => {
      seriesItem.points.forEach((p, pIdx) => {
        const ptX = getXCoordinate(pIdx);
        const incY = getYCoordinate(p.income, chartDataModel.maxVal);
        const expY = getYCoordinate(p.expense, chartDataModel.maxVal);

        const dInc = Math.hypot(mouseX - ptX, mouseY - incY);
        const dExp = Math.hypot(mouseX - ptX, mouseY - expY);

        if (dInc < minDistance) {
          minDistance = dInc;
          closestIndex = pIdx;
          closestPtX = ptX;
          closestPtY = incY;
        }
        if (dExp < minDistance) {
          minDistance = dExp;
          closestIndex = pIdx;
          closestPtX = ptX;
          closestPtY = expY;
        }
      });
    });

    if (minDistance <= 30 && closestIndex !== -1) {
      setHoveredNodeInfo({
        pointIndex: closestIndex,
        svgX: closestPtX,
        svgY: closestPtY
      });
    } else {
      setHoveredNodeInfo(null);
    }
  };

  // Donut Chart Expense Categories
  const expenseCatsList = ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'];
  const expenseTotals = expenseCatsList.map(cat => ({
    name: cat,
    value: getActualCategoryAmount(cat)
  }));
  const totalSelectedExp = getSelectedMonthsExpense();
  const C = 314.16;

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
      const pct = totalSelectedExp > 0 ? (e.value / totalSelectedExp) * 100 : 0;
      const len = totalSelectedExp > 0 ? (e.value / totalSelectedExp) * C : 0;
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
      const pct = totalSelectedInc > 0 ? (e.value / totalSelectedInc) * 100 : 0;
      const len = totalSelectedInc > 0 ? (e.value / totalSelectedInc) * C : 0;
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

  // Savings Distribution Donut
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
  const recentTransactions = useMemo(() => {
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
      
      {/* 4 Summary Metric Cards (EXACT same UI styling as Dòng Tiền tab) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 text-left">
        
        {/* Card 1: Cumulative Net Worth */}
        <div className="kpi-card-purple p-6 flex flex-col justify-between min-h-[145px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-purple-400 text-glow-purple uppercase tracking-widest block">
                TỔNG TÀI SẢN
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none block pt-1.5" title={formatVND(netWorth)}>
                {formatVND(netWorth)}
              </span>
            </div>
            <div className="p-2.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded-2xl shadow-[0_0_12px_rgba(168,85,247,0.35)] shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-500/20 flex items-center justify-between">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-md text-[10px] font-extrabold">
              Ví + Tiết kiệm
            </span>
          </div>
        </div>

        {/* Card 2: Income */}
        <div className="kpi-card-green p-6 flex flex-col justify-between min-h-[145px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-emerald-400 text-glow-green uppercase tracking-widest block">
                THU NHẬP
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 text-glow-green tracking-tight leading-none block pt-1.5" title={formatVND(income)}>
                {formatVND(income)}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-2xl shadow-[0_0_12px_rgba(16,185,129,0.35)] shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md text-[10px] font-extrabold">
              Tháng đã chọn
            </span>
          </div>
        </div>

        {/* Card 3: Expenses */}
        <div className="kpi-card-red p-6 flex flex-col justify-between min-h-[145px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-rose-400 text-glow-red uppercase tracking-widest block">
                CHI TIÊU
              </span>
              <span className="text-2xl sm:text-3xl font-black text-rose-400 text-glow-red tracking-tight leading-none block pt-1.5" title={formatVND(expense)}>
                {formatVND(expense)}
              </span>
            </div>
            <div className="p-2.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-2xl shadow-[0_0_12px_rgba(239,68,68,0.35)] shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-500/20 flex items-center justify-between">
            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-md text-[10px] font-extrabold">
              Tháng đã chọn
            </span>
          </div>
        </div>

        {/* Card 4: Net Surplus */}
        <div className="kpi-card-blue p-6 flex flex-col justify-between min-h-[145px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-cyan-400 text-glow-blue uppercase tracking-widest block">
                NET (THU – CHI)
              </span>
              <span className={`text-2xl sm:text-3xl font-black tracking-tight leading-none block pt-1.5 ${net >= 0 ? 'text-cyan-400 text-glow-blue' : 'text-rose-400 text-glow-red'}`} title={formatVND(net)}>
                {formatVND(net)}
              </span>
            </div>
            <div className="p-2.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded-2xl shadow-[0_0_12px_rgba(6,182,212,0.35)] shrink-0 flex items-center justify-center">
              <MaterialSymbol icon="currency_exchange" size={22} className="text-cyan-300" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-cyan-500/20 flex items-center justify-between">
            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-md text-[10px] font-extrabold">
              Thặng dư ròng
            </span>
          </div>
        </div>

      </div>

      {/* --- MAIN SECTION: Merged Control Header & Long Expanded SVG Chart --- */}
      <div className="calendar-container-depth p-6 bg-[#111422] flex flex-col justify-between space-y-5 text-left rounded-3xl border border-indigo-500/30 shadow-[0_0_30px_rgba(92,54,245,0.15)]">
        
        {/* MERGED CONTROL HEADER: Title + 4 View Modes (Theo Ngày / Theo Tuần / Theo Tháng / Theo Năm) + Zoom controls + Month buttons */}
        <div className="space-y-4 border-b border-white/5 pb-4 select-none">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Xu Hướng Thu Nhập & Chi Tiêu Multiline</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Đối chiếu đường thu chi qua 4 chế độ xem</p>
              </div>
            </div>

            {/* 4 View Modes Segmented Control + Multi-Year + Zoom Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              
              {/* 4 View Modes Toggle Pill with Smooth Transitions */}
              <div className="flex items-center bg-[#090b14] border border-white/10 rounded-xl p-1 text-[10px] font-extrabold">
                {(['days', 'weeks', 'months', 'years'] as const).map(mode => {
                  const labels: Record<string, string> = {
                    days: 'Theo Ngày',
                    weeks: 'Theo Tuần',
                    months: 'Theo Tháng',
                    years: 'Theo Năm'
                  };
                  const isActive = viewMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-[0_0_12px_rgba(92,54,245,0.6)] font-black scale-105'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {labels[mode]}
                    </button>
                  );
                })}
              </div>

              {/* Multi-Year Selection Chips (Visible in Months or Years Mode) */}
              {(viewMode === 'months' || viewMode === 'years') && (
                <div className="flex items-center gap-1.5 border border-white/10 rounded-xl p-1 bg-[#090b14]">
                  <button 
                    onClick={() => toggleYearSelection(chartYear - 1)}
                    className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Thêm năm trước"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  
                  {[2024, 2025, 2026, 2027].map(yr => {
                    const isYrActive = selectedYears.includes(yr);
                    return (
                      <button
                        key={yr}
                        onClick={() => toggleYearSelection(yr)}
                        className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          isYrActive 
                            ? 'bg-indigo-500 text-white shadow-[0_0_8px_rgba(92,54,245,0.6)]' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {yr}
                      </button>
                    );
                  })}

                  <button 
                    onClick={() => toggleYearSelection(chartYear + 1)}
                    className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Thêm năm sau"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Interactive Zoom Buttons Linked to View Mode Switching */}
              <div className="flex items-center gap-1 bg-[#090b14] border border-white/10 rounded-xl p-1">
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Phóng to (Chuyển sang chế độ thời gian chi tiết hơn)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Thu nhỏ (Chuyển sang chế độ thời gian mở rộng)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
              </div>

            </div>
          </div>

          {/* Integrated 12-Month Selector Buttons */}
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 pt-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const mStr = `${chartYear}-${String(m).padStart(2, '0')}`;
              const isSelected = chartSelectedMonths.includes(mStr);
              return (
                <button
                  key={m}
                  onClick={() => toggleChartMonth(mStr)}
                  className={`py-2 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer ${
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

          {/* Legend */}
          {chartDataModel.series.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-extrabold border-t border-white/5">
              <span className="text-slate-400 uppercase tracking-wider text-[10px]">Chú thích:</span>
              {chartDataModel.series.map((s, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#080a14] border border-white/10 shadow-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.incomeColor, boxShadow: `0 0 6px ${s.incomeColor}` }}></span>
                  <span className="text-slate-200">{s.title} (Thu)</span>
                  <span className="text-slate-600">|</span>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.expenseColor, boxShadow: `0 0 6px ${s.expenseColor}` }}></span>
                  <span className="text-slate-200">(Chi)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Long Taller SVG Visual Canvas (900 x 420 Canvas with Refined Precision Proximity Hover) */}
        <div className="w-full overflow-x-auto scrollbar-thin relative py-2">
          {chartDataModel.series.length === 0 ? (
            <div className="h-[420px] flex items-center justify-center text-xs text-slate-500 font-bold bg-[#0b0e18] rounded-2xl border border-white/5">
              Vui lòng chọn ít nhất một tháng hoặc năm ở bộ lọc ở trên để hiển thị biểu đồ.
            </div>
          ) : (
            <div className="relative">
              <svg 
                ref={svgRef}
                className="w-full min-w-[900px] h-[420px]" 
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                onMouseMove={handleSvgMouseMove}
                onMouseLeave={() => setHoveredNodeInfo(null)}
              >
                <defs>
                  {chartDataModel.series.map((s, idx) => (
                    <React.Fragment key={idx}>
                      <linearGradient id={`incGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.incomeColor} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={s.incomeColor} stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id={`expGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.expenseColor} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={s.expenseColor} stopOpacity="0.0" />
                      </linearGradient>
                    </React.Fragment>
                  ))}
                </defs>

                {/* Horizontal Guidelines */}
                {[30, 115, 200, 285, BASE_Y].map((y, idx) => (
                  <line
                    key={idx}
                    x1={MARGIN_LEFT}
                    y1={y}
                    x2={MARGIN_RIGHT}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeDasharray="5 5"
                  />
                ))}

                {/* Y-Axis Value Labels */}
                {[chartDataModel.maxVal, chartDataModel.maxVal * 0.75, chartDataModel.maxVal * 0.5, chartDataModel.maxVal * 0.25, 0].map((val, idx) => {
                  const yPoints = [30, 115, 200, 285, BASE_Y];
                  return (
                    <text
                      key={idx}
                      x="25"
                      y={yPoints[idx] + 4}
                      fill="#64748b"
                      fontSize="10"
                      fontWeight="800"
                      textAnchor="start"
                    >
                      {val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : formatVND(val)}
                    </text>
                  );
                })}

                {/* Vertical Guideline on Precision Hover */}
                {hoveredNodeInfo && (
                  <line
                    x1={getXCoordinate(hoveredNodeInfo.pointIndex)}
                    y1={TOP_Y}
                    x2={getXCoordinate(hoveredNodeInfo.pointIndex)}
                    y2={BASE_Y}
                    stroke="rgba(129, 140, 248, 0.6)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                )}

                {/* Render Series */}
                {chartDataModel.series.map((seriesItem, sIdx) => {
                  const incPoints = seriesItem.points.map((p, pIdx) => ({
                    x: getXCoordinate(pIdx),
                    y: getYCoordinate(p.income, chartDataModel.maxVal)
                  }));

                  const expPoints = seriesItem.points.map((p, pIdx) => ({
                    x: getXCoordinate(pIdx),
                    y: getYCoordinate(p.expense, chartDataModel.maxVal)
                  }));

                  return (
                    <g key={sIdx}>
                      {/* Area Fill */}
                      {chartDataModel.series.length === 1 && (
                        <>
                          <path d={getAreaPath(incPoints)} fill={`url(#incGrad-${sIdx})`} className="pointer-events-none" />
                          <path d={getAreaPath(expPoints)} fill={`url(#expGrad-${sIdx})`} className="pointer-events-none" />
                        </>
                      )}

                      {/* Income Line */}
                      <path
                        d={getCurvyPath(incPoints)}
                        fill="none"
                        stroke={seriesItem.incomeColor}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 6px ${seriesItem.incomeColor})` }}
                      />

                      {/* Expense Line */}
                      <path
                        d={getCurvyPath(expPoints)}
                        fill="none"
                        stroke={seriesItem.expenseColor}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 6px ${seriesItem.expenseColor})` }}
                      />

                      {/* Node Circles */}
                      {incPoints.map((pt, pIdx) => {
                        const isNodeHovered = hoveredNodeInfo?.pointIndex === pIdx;
                        return (
                          <g key={pIdx}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isNodeHovered ? "6" : "4"}
                              fill={seriesItem.incomeColor}
                              stroke="#0b0e18"
                              strokeWidth="2"
                              style={{ filter: isNodeHovered ? `drop-shadow(0 0 6px ${seriesItem.incomeColor})` : undefined }}
                            />
                            <circle
                              cx={expPoints[pIdx].x}
                              cy={expPoints[pIdx].y}
                              r={isNodeHovered ? "6" : "4"}
                              fill={seriesItem.expenseColor}
                              stroke="#0b0e18"
                              strokeWidth="2"
                              style={{ filter: isNodeHovered ? `drop-shadow(0 0 6px ${seriesItem.expenseColor})` : undefined }}
                            />
                          </g>
                        );
                      })}
                    </g>
                  );
                })}

                {/* Horizontal Baseline */}
                <line x1={MARGIN_LEFT} y1={BASE_Y} x2={MARGIN_RIGHT} y2={BASE_Y} stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />

                {/* X-Axis Reference Point Labels */}
                {chartDataModel.xLabels.map((lbl, idx) => {
                  const x = getXCoordinate(idx);
                  const isHovered = hoveredNodeInfo?.pointIndex === idx;
                  return (
                    <text
                      key={idx}
                      x={x}
                      y="395"
                      fill={isHovered ? "#ffffff" : "#94a3b8"}
                      fontSize={viewMode === 'days' && numXPoints > 20 ? "9" : "11"}
                      fontWeight={isHovered ? "900" : "800"}
                      textAnchor="middle"
                    >
                      {lbl}
                    </text>
                  );
                })}
              </svg>

              {/* Precision Hover Tooltip Overlay */}
              {hoveredNodeInfo && chartDataModel.series.length > 0 && (
                <div className="absolute top-4 right-6 bg-[#0d101d]/95 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-mac-dropdown text-xs space-y-2 z-20 pointer-events-none max-w-xs">
                  <span className="font-black text-indigo-300 block border-b border-white/5 pb-1 uppercase tracking-wider text-[11px]">
                    {chartDataModel.xLabels[hoveredNodeInfo.pointIndex]}
                  </span>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                    {chartDataModel.series.map((sItem, sIdx) => {
                      const pt = sItem.points[hoveredNodeInfo.pointIndex];
                      if (!pt) return null;
                      return (
                        <div key={sIdx} className="space-y-0.5 bg-[#080a14] p-2 rounded-xl border border-white/5">
                          <span className="text-[10px] font-black text-slate-400 block">{sItem.title}</span>
                          <div className="flex items-center justify-between gap-3 text-emerald-400 font-black">
                            <span>Thu:</span>
                            <span>{formatVND(pt.income)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-rose-400 font-black">
                            <span>Chi:</span>
                            <span>{formatVND(pt.expense)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- SECTION 2: Income & Expense Distribution Pie Charts Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        
        {/* Income Distribution Pie Chart (With Neon Glow Added Back) */}
        <div className="calendar-container-depth p-5 bg-[#111422] space-y-4 rounded-3xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black text-emerald-400 text-glow-green uppercase tracking-wider">Phân Bổ Thu Nhập</h3>
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
                      style={{ filter: `drop-shadow(0 0 6px ${s.color})` }}
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
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                        <span className="text-slate-200 truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 text-[10px] font-semibold">{formatVND(s.value)}</span>
                        <span className="text-white font-black">{s.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#0b0e18] rounded-full overflow-hidden w-full border border-white/5">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${s.pct}%`, backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expense Distribution Pie Chart (With Neon Glow Added Back) */}
        <div className="calendar-container-depth p-5 bg-[#111422] space-y-4 rounded-3xl border border-rose-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <TrendingDown className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black text-rose-400 text-glow-red uppercase tracking-wider">Phân Bổ Chi Tiêu</h3>
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
                      style={{ filter: `drop-shadow(0 0 6px ${s.color})` }}
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
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                        <span className="text-slate-200 truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 text-[10px] font-semibold">{formatVND(s.value)}</span>
                        <span className="text-white font-black">{s.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#0b0e18] rounded-full overflow-hidden w-full border border-white/5">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${s.pct}%`, backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }}></div>
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
        
        {/* Savings & Accumulation Allocation Ring */}
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
            <div className="relative shrink-0 w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
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
                  style={{ filter: 'drop-shadow(0 0 6px #10b981)' }}
                />
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
                  style={{ filter: 'drop-shadow(0 0 6px #06b6d4)' }}
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
                className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-gradient-to-r from-rose-500 to-red-400' : 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400'}`}
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

      {/* --- SECTION 4: Streamed Recent Activity Feed --- */}
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

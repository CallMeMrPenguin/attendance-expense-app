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
  // Single month mode granularity: 'weeks' vs 'days' (Clean buttons without '(DIEM)')
  const [singleMonthGranularity, setSingleMonthGranularity] = useState<'weeks' | 'days'>('weeks');

  // Multi-Year selection support: array of selected years
  const [selectedYears, setSelectedYears] = useState<number[]>([chartYear]);

  // Zoom controls for SVG graph: zoomLevel (1 to 3)
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Precision Hover state: only set when hovering near/on an actual curve point
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

  // Multi-Line Data Model
  const chartDataModel = useMemo(() => {
    // Mode A: Multi-Year Mode
    if (selectedYears.length > 1) {
      const xLabels = ['Th.1', 'Th.2', 'Th.3', 'Th.4', 'Th.5', 'Th.6', 'Th.7', 'Th.8', 'Th.9', 'Th.10', 'Th.11', 'Th.12'];
      const seriesList = selectedYears.map((yr, yIdx) => {
        const colors = COLOR_PAIRS[yIdx % COLOR_PAIRS.length];
        const points = Array.from({ length: 12 }, (_, mIdx) => {
          const mNum = String(mIdx + 1).padStart(2, '0');
          const mStr = `${yr}-${mNum}`;
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

    // Mode B: Single Year View
    if (chartSelectedMonths.length === 0) return { xLabels: [], series: [], maxVal: 1000000 };

    const sortedMonths = [...chartSelectedMonths].sort((a, b) => a.localeCompare(b));

    // Single Month Mode
    if (sortedMonths.length === 1) {
      const targetMonth = sortedMonths[0];
      const [yStr, mStr] = targetMonth.split('-');
      const monthFormatted = `Th.${Number(mStr)}/${yStr.substring(2)}`;

      if (singleMonthGranularity === 'days') {
        const numDays = getDaysInMonth(targetMonth);
        const xLabels = Array.from({ length: numDays }, (_, i) => `N.${i + 1}`);
        const points = Array.from({ length: numDays }, (_, i) => {
          const d = i + 1;
          return {
            label: `Ng. ${d}/${mStr}`,
            income: getDailyIncome(targetMonth, d),
            expense: getDailyExpense(targetMonth, d)
          };
        });

        const maxVal = Math.max(1000000, ...points.flatMap(p => [p.income, p.expense]));
        return {
          xLabels,
          maxVal,
          series: [
            {
              title: monthFormatted,
              colorIndex: 0,
              incomeColor: COLOR_PAIRS[0].income,
              expenseColor: COLOR_PAIRS[0].expense,
              points
            }
          ]
        };
      } else {
        // Week Mode (4 points)
        const xLabels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
        const points = [
          { label: 'Tuần 1', income: getWeeklyIncome(targetMonth, 1, 7), expense: getWeeklyExpense(targetMonth, 1, 7) },
          { label: 'Tuần 2', income: getWeeklyIncome(targetMonth, 8, 14), expense: getWeeklyExpense(targetMonth, 8, 14) },
          { label: 'Tuần 3', income: getWeeklyIncome(targetMonth, 15, 21), expense: getWeeklyExpense(targetMonth, 15, 21) },
          { label: 'Tuần 4', income: getWeeklyIncome(targetMonth, 22, 31), expense: getWeeklyExpense(targetMonth, 22, 31) }
        ];

        const maxVal = Math.max(1000000, ...points.flatMap(p => [p.income, p.expense]));
        return {
          xLabels,
          maxVal,
          series: [
            {
              title: monthFormatted,
              colorIndex: 0,
              incomeColor: COLOR_PAIRS[0].income,
              expenseColor: COLOR_PAIRS[0].expense,
              points
            }
          ]
        };
      }
    }

    // Multi-Month Mode (Overlay 4 weeks for each selected month)
    const xLabels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
    const seriesList = sortedMonths.map((m, idx) => {
      const [yStr, mStr] = m.split('-');
      const monthFormatted = `Th.${Number(mStr)}/${yStr.substring(2)}`;
      const colors = COLOR_PAIRS[idx % COLOR_PAIRS.length];

      const points = [
        { label: 'Tuần 1', income: getWeeklyIncome(m, 1, 7), expense: getWeeklyExpense(m, 1, 7) },
        { label: 'Tuần 2', income: getWeeklyIncome(m, 8, 14), expense: getWeeklyExpense(m, 8, 14) },
        { label: 'Tuần 3', income: getWeeklyIncome(m, 15, 21), expense: getWeeklyExpense(m, 15, 21) },
        { label: 'Tuần 4', income: getWeeklyIncome(m, 22, 31), expense: getWeeklyExpense(m, 22, 31) }
      ];

      return {
        title: monthFormatted,
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
  }, [selectedYears, chartSelectedMonths, singleMonthGranularity, manualTransactions, sessions, getMonthlyIncome, getMonthlyExpense, getWeeklyIncome, getWeeklyExpense]);

  // Extended Full-Width SVG Canvas Parameters (Canvas dimensions: 800 x 360)
  const SVG_WIDTH = 800;
  const SVG_HEIGHT = 360;
  const MARGIN_LEFT = 35;  // Extended to edge
  const MARGIN_RIGHT = 765; // Extended to edge
  const BASE_Y = 315;
  const TOP_Y = 25;

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

  // Precision Mouse Move Handler: Only shows tooltip when hovering within 28px proximity of an actual line/node
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || numXPoints === 0 || chartDataModel.series.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * (SVG_WIDTH / zoomLevel);
    const mouseY = ((e.clientY - rect.top) / rect.height) * SVG_HEIGHT;

    // Find nearest point and compute exact Euclidean distance
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

    // Proximity Threshold: Only trigger tooltip if mouse is within 32px of actual line nodes
    if (minDistance <= 32 && closestIndex !== -1) {
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
      
      {/* 4 Original Compact KPI Summary Cards (min-h-[140px] concise layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 text-left">
        
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

        {/* Card 2: Income */}
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

        {/* Card 3: Expenses */}
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

        {/* Card 4: Net Surplus */}
        <div className="kpi-editorial-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Net (Thu - Chi)</span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm shrink-0 flex items-center justify-center">
              <MaterialSymbol icon="currency_exchange" size={18} className="text-cyan-400" />
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

      {/* --- MAIN SECTION: Merged Controls Header & Expanded Full-Width SVG Trend Chart --- */}
      <div className="calendar-container-depth p-6 bg-[#111422] flex flex-col justify-between space-y-5 text-left rounded-3xl border border-indigo-500/30 shadow-[0_0_30px_rgba(92,54,245,0.15)]">
        
        {/* MERGED CONTROL HEADER */}
        <div className="space-y-4 border-b border-white/5 pb-4 select-none">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Xu Hướng Thu Nhập & Chi Tiêu Multiline</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Đối chiếu đường thu chi qua các tháng và năm</p>
              </div>
            </div>

            {/* Granularity, Multi-Year & Zoom Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Clean Granularity Buttons: 'Theo Tuần' / 'Theo Ngày' */}
              {chartSelectedMonths.length === 1 && selectedYears.length === 1 && (
                <div className="flex items-center bg-[#090b14] border border-white/10 rounded-xl p-1 text-[10px] font-extrabold">
                  <button
                    onClick={() => setSingleMonthGranularity('weeks')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      singleMonthGranularity === 'weeks'
                        ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(92,54,245,0.5)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Theo Tuần
                  </button>
                  <button
                    onClick={() => setSingleMonthGranularity('days')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      singleMonthGranularity === 'days'
                        ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(92,54,245,0.5)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Theo Ngày
                  </button>
                </div>
              )}

              {/* Multi-Year Selection Chips */}
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

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-[#090b14] border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => setZoomLevel(z => Math.min(3, z + 0.35))}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Phóng to (Zoom In)"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(z => Math.max(1, z - 0.35))}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  title="Thu nhỏ (Zoom Out)"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                {zoomLevel > 1 && (
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 text-indigo-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Đặt lại zoom"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
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
              <span className="text-slate-400 uppercase tracking-wider text-[10px]">Chú thích ({chartDataModel.series.length} đối tượng):</span>
              {chartDataModel.series.map((s, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#080a14] border border-white/10 shadow-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.incomeColor }}></span>
                  <span className="text-slate-200">{s.title} (Thu)</span>
                  <span className="text-slate-600">|</span>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.expenseColor }}></span>
                  <span className="text-slate-200">(Chi)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Extended SVG Visual Canvas (Spans Edge-to-Edge with 360px Height and Proximity Precision Hover) */}
        <div className="w-full overflow-x-auto scrollbar-thin relative py-2">
          {chartDataModel.series.length === 0 ? (
            <div className="h-[360px] flex items-center justify-center text-xs text-slate-500 font-bold bg-[#0b0e18] rounded-2xl border border-white/5">
              Vui lòng chọn ít nhất một tháng hoặc năm ở bộ lọc ở trên để hiển thị biểu đồ.
            </div>
          ) : (
            <div className="relative">
              <svg 
                ref={svgRef}
                className="w-full min-w-[760px] h-[360px] transition-transform duration-300" 
                viewBox={`0 0 ${SVG_WIDTH / zoomLevel} ${SVG_HEIGHT}`}
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
                {[25, 120, 215, BASE_Y].map((y, idx) => (
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
                {[chartDataModel.maxVal, chartDataModel.maxVal * 0.66, chartDataModel.maxVal * 0.33, 0].map((val, idx) => {
                  const yPoints = [25, 120, 215, BASE_Y];
                  return (
                    <text
                      key={idx}
                      x="28"
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

                {/* Vertical Precision Crosshair Line on Hover */}
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
                      {/* Area Fill for Single Series Mode */}
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
                      />

                      {/* Expense Line */}
                      <path
                        d={getCurvyPath(expPoints)}
                        fill="none"
                        stroke={seriesItem.expenseColor}
                        strokeWidth="3.5"
                        strokeLinecap="round"
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
                            />
                            <circle
                              cx={expPoints[pIdx].x}
                              cy={expPoints[pIdx].y}
                              r={isNodeHovered ? "6" : "4"}
                              fill={seriesItem.expenseColor}
                              stroke="#0b0e18"
                              strokeWidth="2"
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
                      y="335"
                      fill={isHovered ? "#ffffff" : "#94a3b8"}
                      fontSize={singleMonthGranularity === 'days' && numXPoints > 20 ? "9" : "11"}
                      fontWeight={isHovered ? "900" : "800"}
                      textAnchor="middle"
                    >
                      {lbl}
                    </text>
                  );
                })}
              </svg>

              {/* Precision Tooltip (Only displayed when mouse is close to an actual node/line) */}
              {hoveredNodeInfo && chartDataModel.series.length > 0 && (
                <div className="absolute top-4 right-6 bg-[#0d101d]/95 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-mac-dropdown text-xs space-y-2 z-20 pointer-events-none max-w-xs">
                  <span className="font-black text-indigo-300 block border-b border-white/5 pb-1 uppercase tracking-wider text-[11px]">
                    Điểm đối chiếu: {chartDataModel.xLabels[hoveredNodeInfo.pointIndex]}
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

      {/* --- SECTION 2: Income & Expense Distribution Pie Charts Grid (Titles: Phân Bổ Thu Nhập & Phân Bổ Chi Tiêu, matching TrendingUp/TrendingDown icons) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        
        {/* Income Distribution Pie Chart */}
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
                    <div className="h-2 bg-[#0b0e18] rounded-full overflow-hidden w-full border border-white/5">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${s.pct}%`, backgroundColor: s.color }}></div>
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
                    <div className="h-2 bg-[#0b0e18] rounded-full overflow-hidden w-full border border-white/5">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${s.pct}%`, backgroundColor: s.color }}></div>
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

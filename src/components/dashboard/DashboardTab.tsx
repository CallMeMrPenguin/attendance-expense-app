import React, { useState, useMemo } from 'react';
import { 
  DashboardTabProps, 
  COLOR_PAIRS, 
  getCategoryColor 
} from './dashboard-constants';
import { DashboardMetricCards } from './DashboardMetricCards';
import { DashboardTrendChart, ChartDataModel, ChartSeriesItem } from './DashboardTrendChart';
import { DashboardDistributionSection } from './DashboardDistributionSection';
import { RecentActivityFeed, RecentTransactionItem } from './RecentActivityFeed';

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
  getPrecedingRollOverBalance,
  
  handleOpenTxModal,
  setActiveTab
}: DashboardTabProps) {
  // 4 Viewing Modes: 'days' | 'weeks' | 'months' | 'years'
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months' | 'years'>('weeks');

  // Multi-Year selection support
  const [selectedYears, setSelectedYears] = useState<number[]>([chartYear]);

  const income = getSelectedMonthsIncome();
  const expense = getSelectedMonthsExpense();
  const net = income - expense;

  // Net worth cumulative calculation
  const totalIncomeAll = getTotalIncome();
  const totalExpenseAll = getTotalExpense();
  const walletCash = totalIncomeAll - totalExpenseAll;
  const savings = emergencyCurrent + accumulationCurrent;
  const netWorth = walletCash + savings;

  // Helper for daily income calculation
  const getDailyIncome = (monthStr: string, day: number) => {
    const dayStr = `${monthStr}-${String(day).padStart(2, '0')}`;
    return manualTransactions
      .filter(t => t.type === 'income' && t.date === dayStr)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
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
  const chartDataModel = useMemo<ChartDataModel>(() => {
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
            title: 'Tất cả năm chọn',
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
      const xLabels = Array.from({ length: 12 }, (_, i) => `T.${i + 1}`);
      const seriesList: ChartSeriesItem[] = selectedYears.map((yr, idx) => {
        const colorPair = COLOR_PAIRS[idx % COLOR_PAIRS.length];
        const points = Array.from({ length: 12 }, (_, i) => {
          const mStr = `${yr}-${String(i + 1).padStart(2, '0')}`;
          return {
            label: `T.${i + 1}`,
            income: getMonthlyIncome(mStr),
            expense: getMonthlyExpense(mStr)
          };
        });
        return {
          title: `Năm ${yr}`,
          colorIndex: idx,
          incomeColor: colorPair.income,
          expenseColor: colorPair.expense,
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
      const daysCount = getDaysInMonth(activeMonth);
      const xLabels = Array.from({ length: daysCount }, (_, i) => `${i + 1}`);
      const seriesList: ChartSeriesItem[] = chartSelectedMonths.map((mStr, idx) => {
        const [yStr, mNum] = mStr.split('-');
        const colorPair = COLOR_PAIRS[idx % COLOR_PAIRS.length];
        const points = Array.from({ length: daysCount }, (_, i) => ({
          label: `${i + 1}`,
          income: getDailyIncome(mStr, i + 1),
          expense: getDailyExpense(mStr, i + 1)
        }));
        return {
          title: `Th.${Number(mNum)}/${yStr.substring(2)}`,
          colorIndex: idx,
          incomeColor: colorPair.income,
          expenseColor: colorPair.expense,
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

    // 4. Theo Tuần Mode ('weeks') - Default
    if (chartSelectedMonths.length > 1) {
      const xLabels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
      const seriesList: ChartSeriesItem[] = chartSelectedMonths.map((mStr, idx) => {
        const [yStr, mNum] = mStr.split('-');
        const colorPair = COLOR_PAIRS[idx % COLOR_PAIRS.length];
        return {
          title: `Th.${Number(mNum)}/${yStr.substring(2)}`,
          colorIndex: idx,
          incomeColor: colorPair.income,
          expenseColor: colorPair.expense,
          points: [
            { label: 'Tuần 1', income: getWeeklyIncome(mStr, 1, 7), expense: getWeeklyExpense(mStr, 1, 7) },
            { label: 'Tuần 2', income: getWeeklyIncome(mStr, 8, 14), expense: getWeeklyExpense(mStr, 8, 14) },
            { label: 'Tuần 3', income: getWeeklyIncome(mStr, 15, 21), expense: getWeeklyExpense(mStr, 15, 21) },
            { label: 'Tuần 4', income: getWeeklyIncome(mStr, 22, 31), expense: getWeeklyExpense(mStr, 22, 31) }
          ]
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

  // Donut Chart Expense Categories list with local storage check
  const expenseCatsList = useMemo(() => {
    const defaultCats = ['Ăn uống', 'Di chuyển', 'Shopping', 'Hóa đơn', 'Giải trí', 'Khác'];
    if (typeof window === 'undefined' || !currentUser?.id) return defaultCats;
    const stored = localStorage.getItem(`finance_expense_cats_${currentUser.id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: any) => c.name || String(c)).filter(Boolean);
        }
      } catch (e) { console.error(e); }
    }
    return defaultCats;
  }, [currentUser?.id]);

  const expenseTotals = expenseCatsList.map(cat => ({
    name: cat,
    value: getActualCategoryAmount(cat)
  }));
  const totalSelectedExp = getSelectedMonthsExpense();
  const C = 314.16;

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
        color: getCategoryColor(e.name, true),
        dashArray: `${len} ${C}`,
        dashOffset: -offset
      };
    });

  // Donut Chart Income Categories list with local storage check
  const incomeCatsList = useMemo(() => {
    const defaultCats = ['Lương', 'Giáo dục', 'Đầu tư', 'Khác'];
    if (typeof window === 'undefined' || !currentUser?.id) return defaultCats;
    const stored = localStorage.getItem(`finance_income_cats_${currentUser.id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: any) => c.name || String(c)).filter(Boolean);
        }
      } catch (e) { console.error(e); }
    }
    return defaultCats;
  }, [currentUser?.id]);

  const incomeTotals = incomeCatsList.map(cat => ({
    name: cat,
    value: getActualCategoryAmount(cat)
  }));
  const totalSelectedInc = getSelectedMonthsIncome();

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
        color: getCategoryColor(e.name, false),
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

  // Recent transactions preview
  const recentTransactions = useMemo<RecentTransactionItem[]>(() => {
    const list = manualTransactions.map(t => ({
      id: t.id,
      desc: t.desc,
      amount: Number(t.amount) || 0,
      type: (t.type || 'expense') as 'income' | 'expense' | 'exchange',
      date: t.date,
      category: t.category
    }));
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4);
  }, [manualTransactions]);

  const rollOverVal = getPrecedingRollOverBalance ? getPrecedingRollOverBalance(chartSelectedMonths[0] || '') : 0;

  return (
    <div className="space-y-6 animate-mac-dropdown select-none">
      {/* 4 Summary Metric Cards */}
      <DashboardMetricCards
        netWorth={netWorth}
        income={income}
        expense={expense}
        net={net}
        rollOverVal={rollOverVal}
      />

      {/* Main Section: Trend Graph Visual Canvas */}
      <DashboardTrendChart
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedYears={selectedYears}
        toggleYearSelection={toggleYearSelection}
        chartYear={chartYear}
        chartSelectedMonths={chartSelectedMonths}
        toggleChartMonth={toggleChartMonth}
        chartDataModel={chartDataModel}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
      />

      {/* Section 2 & 3: Income/Expense Distribution & Savings / Budget Allocation */}
      <DashboardDistributionSection
        incomeSlices={incomeSlices}
        expenseSlices={expenseSlices}
        totalSelectedInc={totalSelectedInc}
        totalSelectedExp={totalSelectedExp}
        emergencyCurrent={emergencyCurrent}
        accumulationCurrent={accumulationCurrent}
        budgetPercent={budgetPercent}
        isOverBudget={isOverBudget}
        expense={expense}
        totalExpBudget={totalExpBudget}
        setActiveTab={setActiveTab}
      />

      {/* Section 4: Streamed Recent Activity Feed */}
      <RecentActivityFeed
        recentTransactions={recentTransactions}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}

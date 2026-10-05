import React from 'react';
import { Session } from '@/lib/utils';

export interface DashboardTabProps {
  currentUser: {
    id?: string;
    teacherName: string;
  };
  manualTransactions: any[];
  sessions: Session[];
  allFinanceTransactions?: any[];
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
  getPrecedingRollOverBalance?: (monthStr: string) => number;
  
  handleOpenTxModal: (type: 'income' | 'expense' | 'saving' | 'exchange') => void;
  setActiveTab: (tab: 'dashboard' | 'flow' | 'saving' | 'schedule' | 'settings') => void;
}

// 24 Color Choices for up to 12 Pairs (Multi-month or Multi-year comparison)
export const COLOR_PAIRS = [
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

export const getCategoryColor = (name: string, isExpense: boolean): string => {
  if (isExpense) {
    const colors = ['#f59e0b', '#3b82f6', '#ec4899', '#a855f7', '#f43f5e', '#64748b', '#e11d48', '#0ea5e9', '#0d9488'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  } else {
    const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
};

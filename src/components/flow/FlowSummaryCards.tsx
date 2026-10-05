import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import MaterialSymbol from '@/components/MaterialSymbol';
import { formatVND } from '@/lib/utils';

interface FlowSummaryCardsProps {
  projectedIncome: number;
  totalIncome: number;
  totalExpense: number;
  netValue: number;
  incomeChange: number;
  expenseChange: number;
  netChange: number;
}

export const FlowSummaryCards: React.FC<FlowSummaryCardsProps> = ({
  projectedIncome,
  totalIncome,
  totalExpense,
  netValue,
  incomeChange,
  expenseChange,
  netChange,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      <div className="kpi-card-purple p-6 flex flex-col justify-between min-h-[120px] text-left">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <span className="text-[10px] font-black text-purple-400 text-glow-purple uppercase tracking-widest block">Thu Nhập Dự Kiến</span>
            <span className="text-xl font-black text-purple-400 text-glow-purple tracking-tight block">{formatVND(projectedIncome)}</span>
            <div className="flex items-center gap-1 select-none">
              <span className="text-[9px] font-black text-purple-300/80">
                Dự kiến ca dạy + Mục tiêu thu nhập
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
  );
};

export default FlowSummaryCards;

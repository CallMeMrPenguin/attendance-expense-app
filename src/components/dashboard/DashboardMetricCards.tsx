import React from 'react';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { formatVND } from '@/lib/utils';
import MaterialSymbol from '../MaterialSymbol';

interface DashboardMetricCardsProps {
  netWorth: number;
  income: number;
  expense: number;
  net: number;
  rollOverVal: number;
}

export function DashboardMetricCards({
  netWorth,
  income,
  expense,
  net,
  rollOverVal,
}: DashboardMetricCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 text-left">
      {/* Card 1: Cumulative Net Worth */}
      <div className="kpi-card-purple p-6 flex flex-col justify-between min-h-[145px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1">
            <span className="text-[11px] font-black text-purple-400 text-glow-purple uppercase tracking-widest block">
              TỔNG TÀI SẢN
            </span>
            <span className="text-2xl font-black text-white tracking-tight leading-none block pt-1.5" title={formatVND(netWorth)}>
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
            <span className="text-2xl font-black text-emerald-400 text-glow-green tracking-tight leading-none block pt-1.5" title={formatVND(income)}>
              {formatVND(income)}
            </span>
          </div>
          <div className="p-2.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-2xl shadow-[0_0_12px_rgba(168,85,247,0.35)] shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between">
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-md text-[10px] font-extrabold">
            Kỳ báo cáo {rollOverVal > 0 ? `(+${formatVND(rollOverVal)} dồn)` : ''}
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
            <span className="text-2xl font-black text-rose-400 text-glow-red tracking-tight leading-none block pt-1.5" title={formatVND(expense)}>
              {formatVND(expense)}
            </span>
          </div>
          <div className="p-2.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-2xl shadow-[0_0_12px_rgba(239,68,68,0.35)] shrink-0">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-rose-500/20 flex items-center justify-between">
          <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-md text-[10px] font-extrabold">
            Kỳ báo cáo
          </span>
        </div>
      </div>

      {/* Card 4: Net Surplus */}
      <div className="kpi-card-blue p-6 flex flex-col justify-between min-h-[145px] relative overflow-hidden group hover:scale-[1.01] transition-all cursor-default">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1">
            <span className="text-[11px] font-black text-cyan-400 text-glow-blue uppercase tracking-widest block">
              THẶNG DƯ RÒNG
            </span>
            <span className={`text-2xl font-black tracking-tight leading-none block pt-1.5 ${net >= 0 ? 'text-cyan-400 text-glow-blue' : 'text-rose-400 text-glow-red'}`} title={formatVND(net)}>
              {formatVND(net)}
            </span>
          </div>
          <div className="p-2.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 rounded-2xl shadow-[0_0_12px_rgba(6,182,212,0.35)] shrink-0 flex items-center justify-center">
            <MaterialSymbol icon="currency_exchange" size={22} className="text-cyan-300" />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-cyan-500/20 flex items-center justify-between">
          <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-md text-[10px] font-extrabold">
            Thu – Chi thực tế {rollOverVal > 0 ? `(bao gồm dư dồn)` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

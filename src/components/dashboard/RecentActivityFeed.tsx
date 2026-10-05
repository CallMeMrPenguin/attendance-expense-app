import React from 'react';
import { Clock, ArrowUpRight } from 'lucide-react';
import { formatVND, formatDateVN } from '@/lib/utils';

export interface RecentTransactionItem {
  id: string;
  desc: string;
  amount: number;
  type: 'income' | 'expense' | 'exchange';
  date: string;
  category: string;
}

interface RecentActivityFeedProps {
  recentTransactions: RecentTransactionItem[];
  setActiveTab: (tab: 'dashboard' | 'flow' | 'saving' | 'schedule' | 'settings') => void;
}

export function RecentActivityFeed({
  recentTransactions,
  setActiveTab,
}: RecentActivityFeedProps) {
  if (recentTransactions.length === 0) return null;

  return (
    <div className="calendar-container-depth p-5 bg-[#111422] space-y-3 text-left rounded-3xl border border-white/10">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-[0_0_10px_rgba(92,54,245,0.3)]">
            <Clock className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-black text-white text-glow-purple uppercase tracking-wider">Giao Dịch Gần Đây</h3>
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
          const isExchange = t.type === 'exchange';
          return (
            <div key={t.id} className="p-3 bg-[#0b0e18] border border-white/5 hover:border-white/15 rounded-2xl flex items-center justify-between text-xs transition-all">
              <div className="min-w-0 pr-2 space-y-0.5">
                <span className="font-extrabold text-white truncate block">{t.desc}</span>
                <span className="text-[9px] font-bold text-slate-500 block">{formatDateVN(t.date)} | {t.category}</span>
              </div>
              <span className={`font-black shrink-0 ${isInc ? 'text-emerald-400' : isExchange ? 'text-cyan-400' : 'text-rose-400'}`}>
                {isInc ? '+' : isExchange ? '' : '-'}{formatVND(t.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

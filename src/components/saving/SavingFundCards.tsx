import React from 'react';
import { Shield, Plus, ArrowDownRight } from 'lucide-react';
import { formatVND, formatNumberDots, parseNumberDots } from '@/lib/utils';
import MaterialSymbol from '@/components/MaterialSymbol';
import RadialProgress from './RadialProgress';

interface SavingFundCardsProps {
  userId: string;
  emergencyCurrent: number;
  emergencyTarget: number;
  accumulationCurrent: number;
  accumulationTarget: number;
  saveEmergencyTarget: (userId: string, val: number) => void;
  saveAccumulationTarget: (userId: string, val: number) => void;
  onOpenQuickModal: (fund: 'emergency' | 'accumulation', action: 'deposit' | 'withdraw') => void;
}

export const SavingFundCards: React.FC<SavingFundCardsProps> = ({
  userId,
  emergencyCurrent,
  emergencyTarget,
  accumulationCurrent,
  accumulationTarget,
  saveEmergencyTarget,
  saveAccumulationTarget,
  onOpenQuickModal,
}) => {
  const emPercent = Math.min(100, Math.round((emergencyCurrent / Math.max(1, emergencyTarget)) * 100));
  const acPercent = Math.min(100, Math.round((accumulationCurrent / Math.max(1, accumulationTarget)) * 100));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Card 1: Quỹ Dự Phòng (Green KPI Style) */}
      <div className="kpi-card-green p-6 flex flex-col justify-between space-y-5 text-left relative overflow-hidden group transition-all">
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-emerald-400 text-glow-green uppercase tracking-widest block">
                  Quỹ Dự Phòng
                </span>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Dành cho tình huống khẩn cấp bất ngờ.</p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 rounded-full shrink-0 shadow-sm">
                Đạt {emPercent}%
              </span>
            </div>

            {/* Balance & Target money directly below actual money */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">SỐ DƯ HIỆN TẠI</span>
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 text-glow-green leading-none tracking-tight">
                  {formatVND(emergencyCurrent)}
                </p>
                
                {/* Target money under actual money */}
                <div className="flex items-center gap-1 text-slate-400 pt-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Mục tiêu:</span>
                  <input
                    type="text"
                    value={formatNumberDots(emergencyTarget)}
                    onChange={(e) => {
                      saveEmergencyTarget(userId, parseNumberDots(e.target.value));
                    }}
                    className="w-28 bg-white/[0.06] border border-white/10 rounded-md px-2 py-0.5 text-xs sm:text-sm font-extrabold text-emerald-300 text-right focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                  <span className="text-[10px] font-extrabold text-slate-400">VND</span>
                </div>
              </div>

              {/* Radial Progress Circle */}
              <RadialProgress percentage={emPercent} color="emerald" />
            </div>
          </div>

          {/* Top Right Icon Badge */}
          <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl shadow-[0_0_12px_rgba(16,185,129,0.35)] shrink-0">
            <Shield className="h-5 w-5" />
          </div>
        </div>

        {/* Quick Action Buttons for Quỹ Dự Phòng */}
        <div className="pt-3 border-t border-emerald-500/20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenQuickModal('emergency', 'deposit')}
            className="flex-1 py-2 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nạp Tiền</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenQuickModal('emergency', 'withdraw')}
            className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
            <span>Rút Tiền</span>
          </button>
        </div>
      </div>

      {/* Card 2: Quỹ Tích Lũy (Blue/Cyan KPI Style) */}
      <div className="kpi-card-blue p-6 flex flex-col justify-between space-y-5 text-left relative overflow-hidden group transition-all">
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-cyan-400 text-glow-blue uppercase tracking-widest block">
                  Quỹ Tích Lũy
                </span>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Dành cho mục tiêu lớn đầu tư dài hạn.</p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 rounded-full shrink-0 shadow-sm">
                Đạt {acPercent}%
              </span>
            </div>

            {/* Balance & Target money directly below actual money */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">SỐ DƯ HIỆN TẠI</span>
                <p className="text-2xl sm:text-3xl font-black text-cyan-400 text-glow-blue leading-none tracking-tight">
                  {formatVND(accumulationCurrent)}
                </p>
                
                {/* Target money under actual money */}
                <div className="flex items-center gap-1 text-slate-400 pt-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Mục tiêu:</span>
                  <input
                    type="text"
                    value={formatNumberDots(accumulationTarget)}
                    onChange={(e) => {
                      saveAccumulationTarget(userId, parseNumberDots(e.target.value));
                    }}
                    className="w-28 bg-white/[0.06] border border-white/10 rounded-md px-2 py-0.5 text-xs sm:text-sm font-extrabold text-cyan-300 text-right focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                  <span className="text-[10px] font-extrabold text-slate-400">VND</span>
                </div>
              </div>

              {/* Radial Progress Circle */}
              <RadialProgress percentage={acPercent} color="cyan" />
            </div>
          </div>

          {/* Top Right Icon Badge */}
          <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-xl shadow-[0_0_12px_rgba(6,182,212,0.35)] shrink-0 flex items-center justify-center">
            <MaterialSymbol icon="finance_mode" size={20} className="text-cyan-400" />
          </div>
        </div>

        {/* Quick Action Buttons for Quỹ Tích Lũy */}
        <div className="pt-3 border-t border-cyan-500/20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenQuickModal('accumulation', 'deposit')}
            className="flex-1 py-2 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nạp Tiền</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenQuickModal('accumulation', 'withdraw')}
            className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />
            <span>Rút Tiền</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavingFundCards;

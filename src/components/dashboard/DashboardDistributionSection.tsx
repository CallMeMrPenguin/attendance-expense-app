import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  ArrowUpRight, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { formatVND } from '@/lib/utils';
import MaterialSymbol from '../MaterialSymbol';

interface PieSlice {
  name: string;
  value: number;
  pct: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

interface DashboardDistributionSectionProps {
  incomeSlices: PieSlice[];
  expenseSlices: PieSlice[];
  totalSelectedInc: number;
  totalSelectedExp: number;
  emergencyCurrent: number;
  accumulationCurrent: number;
  budgetPercent: number;
  isOverBudget: boolean;
  expense: number;
  totalExpBudget: number;
  setActiveTab: (tab: 'dashboard' | 'flow' | 'saving' | 'schedule' | 'settings') => void;
}

export function DashboardDistributionSection({
  incomeSlices,
  expenseSlices,
  totalSelectedInc,
  totalSelectedExp,
  emergencyCurrent,
  accumulationCurrent,
  budgetPercent,
  isOverBudget,
  expense,
  totalExpBudget,
  setActiveTab,
}: DashboardDistributionSectionProps) {
  const C = 314.16;
  const totalSavings = emergencyCurrent + accumulationCurrent;
  const emShare = totalSavings > 0 ? Math.round((emergencyCurrent / totalSavings) * 100) : 50;
  const acShare = totalSavings > 0 ? 100 - emShare : 50;
  const emLen = totalSavings > 0 ? (emergencyCurrent / totalSavings) * C : C / 2;

  return (
    <>
      {/* --- SECTION 2: Income & Expense Distribution Pie Charts Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        {/* Income Distribution Pie Chart */}
        <div className="calendar-container-depth p-5 bg-[#111422] space-y-4 rounded-3xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
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
                <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="-12 -12 144 144">
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
                  <span className="text-[9px] font-extrabold text-emerald-400 uppercase leading-none text-glow-green">Thu Nhập</span>
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

        {/* Expense Distribution Pie Chart */}
        <div className="calendar-container-depth p-5 bg-[#111422] space-y-4 rounded-3xl border border-rose-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
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
                <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="-12 -12 144 144">
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
                  <span className="text-[9px] font-extrabold text-rose-400 uppercase leading-none text-glow-red">Chi Tiêu</span>
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
              <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
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
              <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="-12 -12 144 144">
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
                    <span className="text-[10px] font-black text-emerald-300 text-glow-green uppercase block leading-none">Quỹ Dự Phòng</span>
                    <span className="text-xs font-black text-white block mt-1">{formatVND(emergencyCurrent)}</span>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">{emShare}%</span>
              </div>

              <div className="bg-[#0b0e18] border border-cyan-500/30 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <MaterialSymbol icon="finance_mode" size={18} className="text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-[10px] font-black text-cyan-300 text-glow-blue uppercase block leading-none">Quỹ Tích Lũy</span>
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
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-[0_0_10px_rgba(92,54,245,0.3)]">
                {isOverBudget ? <AlertCircle className="h-4 w-4 text-rose-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              </div>
              <h3 className="text-xs font-black text-white text-glow-purple uppercase tracking-wider">Hạn Mức Ngân Sách Tổng</h3>
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
    </>
  );
}

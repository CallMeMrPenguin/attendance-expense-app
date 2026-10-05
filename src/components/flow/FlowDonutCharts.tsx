import React from 'react';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatVND } from '@/lib/utils';

export interface PieSlice {
  name: string;
  value: number;
  color: string;
  pct: number;
  dashArray: string;
  dashOffset: number;
}

interface FlowDonutChartsProps {
  distMode: 'month' | 'avg_year';
  setDistMode: (mode: 'month' | 'avg_year') => void;
  distYear: number;
  setDistYear: React.Dispatch<React.SetStateAction<number>>;
  totalPieInc: number;
  totalPieExp: number;
  incomeSlices: PieSlice[];
  expenseSlices: PieSlice[];
}

export const FlowDonutCharts: React.FC<FlowDonutChartsProps> = ({
  distMode,
  setDistMode,
  distYear,
  setDistYear,
  totalPieInc,
  totalPieExp,
  incomeSlices,
  expenseSlices,
}) => {
  return (
    <div className="space-y-3 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider">Chế độ xem phân bổ:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sliding Pill Indicator Segmented Control */}
          <div className="relative flex bg-[#0d1018] p-1 rounded-xl border border-white/10 text-xs shrink-0 font-bold select-none">
            <div 
              className="absolute top-1 bottom-1 rounded-lg bg-[#5c36f5] shadow-[0_0_12px_rgba(92,54,245,0.4)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none"
              style={{
                left: distMode === 'month' ? '4px' : 'calc(50% + 2px)',
                width: 'calc(50% - 6px)'
              }}
            />
            <button
              type="button"
              onClick={() => setDistMode('month')}
              className={`flex-1 relative z-10 px-3 py-1 text-center transition-colors cursor-pointer ${
                distMode === 'month' ? 'text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Theo Tháng
            </button>
            <button
              type="button"
              onClick={() => setDistMode('avg_year')}
              className={`flex-1 relative z-10 px-3 py-1 text-center transition-colors cursor-pointer ${
                distMode === 'avg_year' ? 'text-white font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Trung Bình / Tháng
            </button>
          </div>

          {distMode === 'avg_year' && (
            <div className="flex items-center gap-1.5 bg-[#0d1018] px-2.5 py-1 rounded-xl border border-white/10 text-xs font-bold text-indigo-400">
              <button 
                type="button"
                onClick={() => setDistYear(y => y - 1)}
                className="p-0.5 text-slate-400 hover:text-white rounded hover:bg-white/5 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span>Năm {distYear}</span>
              <button 
                type="button"
                onClick={() => setDistYear(y => y + 1)}
                className="p-0.5 text-slate-400 hover:text-white rounded hover:bg-white/5 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Distribution Pie Chart */}
        <div className="calendar-container-depth p-5 bg-[#0e1222] space-y-4 rounded-3xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black text-emerald-400 text-glow-green uppercase tracking-wider">Phân Bổ Thu Nhập Theo Danh Mục</h3>
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              {distMode === 'avg_year' ? `TB: ${formatVND(totalPieInc)}/tháng` : `Tổng: ${formatVND(totalPieInc)}`}
            </span>
          </div>

          {totalPieInc === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-extrabold bg-[#090c18] rounded-2xl border border-white/5">
              Chưa ghi nhận thu nhập phát sinh trong khoảng thời gian này.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* SVG Donut */}
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
                      style={{ filter: `drop-shadow(0 0 5px ${s.color}) drop-shadow(0 0 10px ${s.color}80)` }}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-extrabold text-emerald-400 uppercase leading-none text-glow-green">Thu Nhập</span>
                  <span className="text-xs font-black text-white leading-none mt-1 truncate max-w-[85px]" title={formatVND(totalPieInc)}>
                    {totalPieInc >= 1000000 ? `${(totalPieInc / 1000000).toFixed(1)}M` : formatVND(totalPieInc)}
                  </span>
                </div>
              </div>

              {/* Legend Badges */}
              <div className="flex-1 space-y-2 w-full">
                {incomeSlices.map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}, 0 0 12px ${s.color}80` }} />
                        <span className="text-slate-200 truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 text-[10px] font-semibold">{formatVND(s.value)}</span>
                        <span className="text-white font-black">{s.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-[#080c18] rounded-full relative overflow-visible w-full border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
                      <div className="h-full rounded-full transition-all duration-300 relative" style={{ width: `${s.pct}%`, backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}, 0 0 16px ${s.color}99` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expense Distribution Pie Chart */}
        <div className="calendar-container-depth p-5 bg-[#0e1222] space-y-4 rounded-3xl border border-rose-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                <TrendingDown className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-black text-rose-400 text-glow-red uppercase tracking-wider">Phân Bổ Chi Tiêu Theo Danh Mục</h3>
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
              {distMode === 'avg_year' ? `TB: ${formatVND(totalPieExp)}/tháng` : `Tổng: ${formatVND(totalPieExp)}`}
            </span>
          </div>

          {totalPieExp === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-extrabold bg-[#090c18] rounded-2xl border border-white/5">
              Chưa phát sinh chi tiêu trong khoảng thời gian này.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* SVG Donut */}
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
                      style={{ filter: `drop-shadow(0 0 5px ${s.color}) drop-shadow(0 0 10px ${s.color}80)` }}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-extrabold text-rose-400 uppercase leading-none">Chi Tiêu</span>
                  <span className="text-xs font-black text-white leading-none mt-1 truncate max-w-[85px]" title={formatVND(totalPieExp)}>
                    {totalPieExp >= 1000000 ? `${(totalPieExp / 1000000).toFixed(1)}M` : formatVND(totalPieExp)}
                  </span>
                </div>
              </div>

              {/* Legend Badges */}
              <div className="flex-1 space-y-2 w-full">
                {expenseSlices.map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}, 0 0 12px ${s.color}80` }} />
                        <span className="text-slate-200 truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 text-[10px] font-semibold">{formatVND(s.value)}</span>
                        <span className="text-white font-black">{s.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-[#080c18] rounded-full relative overflow-visible w-full border border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
                      <div className="h-full rounded-full transition-all duration-300 relative" style={{ width: `${s.pct}%`, backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}, 0 0 16px ${s.color}99` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlowDonutCharts;

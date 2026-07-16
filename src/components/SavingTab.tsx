import React, { useState } from 'react';
import { 
  Shield, 
  TrendingUp,
  Target, 
  ChevronRight, 
  Filter,
  Activity
} from 'lucide-react';
import { formatVND, formatNumberDots, parseNumberDots } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

interface SavingTabProps {
  currentUser: {
    id: string;
  };
  emergencyCurrent: number;
  emergencyTarget: number;
  accumulationCurrent: number;
  accumulationTarget: number;
  savingsHistory: any[];
  manualTransactions?: any[];
  saveEmergencyCurrent: (userId: string, val: number) => void;
  saveEmergencyTarget: (userId: string, val: number) => void;
  saveAccumulationCurrent: (userId: string, val: number) => void;
  saveAccumulationTarget: (userId: string, val: number) => void;
  saveSavingsHistory: (userId: string, data: any[]) => void;
  saveTransactions?: (userId: string, data: any[]) => void;
}

// SVG Radial Progress Indicator (Emerald & Cyan support)
const RadialProgress = ({ percentage, color }: { percentage: number; color: 'emerald' | 'cyan' }) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percentage) / 100;
  const strokeColor = color === 'emerald' ? '#10b981' : '#06b6d4';
  const glowShadow = color === 'emerald' 
    ? 'drop-shadow(0 0 6px rgba(16,185,129,0.8))' 
    : 'drop-shadow(0 0 6px rgba(6,182,212,0.8))';

  return (
    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          className="stroke-[#101424]"
          strokeWidth="6"
          fill="transparent"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke={strokeColor}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{ filter: glowShadow, transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="absolute text-xs font-black text-white tracking-tight">{percentage}%</span>
    </div>
  );
};

// Sleek Donut / Pie Chart Component
const SleekDonutChart = ({ emergencyAmount, accumulationAmount }: { emergencyAmount: number; accumulationAmount: number }) => {
  const total = emergencyAmount + accumulationAmount;
  const emShare = total > 0 ? Math.round((emergencyAmount / total) * 100) : 50;
  const acShare = total > 0 ? 100 - emShare : 50;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const emOffset = circumference - (circumference * emShare) / 100;
  const acOffset = circumference - (circumference * acShare) / 100;

  return (
    <div className="relative w-full py-2 flex flex-col items-center justify-center space-y-4">
      {/* Sleek Ring Donut */}
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
          <defs>
            <linearGradient id="emRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="acRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <filter id="emGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.6" />
            </filter>
            <filter id="acGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#06b6d4" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Background Ring Track */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="stroke-[#101424]"
            strokeWidth="14"
            fill="transparent"
          />

          {/* Segment 1: Quỹ Dự Phòng (Green) */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke="url(#emRingGrad)"
            strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={emOffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ filter: 'url(#emGlow)', transition: 'all 0.6s ease' }}
          />

          {/* Segment 2: Quỹ Tích Lũy (Cyan) */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke="url(#acRingGrad)"
            strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={acOffset}
            strokeLinecap="round"
            fill="transparent"
            transform={`rotate(${(emShare / 100) * 360} 70 70)`}
            style={{ filter: 'url(#acGlow)', transition: 'all 0.6s ease' }}
          />
        </svg>

        {/* Center Label inside Donut */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">TỈ LỆ</span>
          <span className="text-lg font-black text-white leading-none mt-0.5">{emShare}% / {acShare}%</span>
        </div>
      </div>

      {/* Breakdown Legend Badges */}
      <div className="grid grid-cols-2 gap-2.5 w-full">
        <div className="bg-[#12172a] border border-emerald-500/30 rounded-2xl p-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]"></span>
            <span className="text-[10px] font-black text-emerald-300 uppercase truncate">Quỹ Dự Phòng</span>
          </div>
          <span className="text-xs font-black text-white ml-1">{emShare}%</span>
        </div>

        <div className="bg-[#12172a] border border-cyan-500/30 rounded-2xl p-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]"></span>
            <span className="text-[10px] font-black text-cyan-300 uppercase truncate">Quỹ Tích Lũy</span>
          </div>
          <span className="text-xs font-black text-white ml-1">{acShare}%</span>
        </div>
      </div>
    </div>
  );
};

export default function SavingTab({
  currentUser,
  emergencyCurrent,
  emergencyTarget,
  accumulationCurrent,
  accumulationTarget,
  savingsHistory,
  saveEmergencyTarget,
  saveAccumulationTarget
}: SavingTabProps) {
  const { showToast } = useToast();
  const [historyFilter, setHistoryFilter] = useState<'all' | 'emergency' | 'accumulation' | 'deposit' | 'withdraw'>('all');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const emPercent = Math.min(100, Math.round((emergencyCurrent / Math.max(1, emergencyTarget)) * 100));
  const acPercent = Math.min(100, Math.round((accumulationCurrent / Math.max(1, accumulationTarget)) * 100));
  const totalSavingsBalance = emergencyCurrent + accumulationCurrent;

  // Filtered savings history list
  const filteredHistory = savingsHistory.filter(h => {
    if (historyFilter === 'all') return true;
    if (historyFilter === 'emergency') return h.fund === 'emergency';
    if (historyFilter === 'accumulation') return h.fund === 'accumulation';
    if (historyFilter === 'deposit') return h.type === 'deposit';
    if (historyFilter === 'withdraw') return h.type === 'withdraw';
    return true;
  });

  return (
    <div className="space-y-6 animate-mac-dropdown text-left select-none">
      {/* Header section with graphic asset */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 relative">
        <div className="flex flex-col space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
            Kế Hoạch Tiết Kiệm
          </h2>
          <p className="text-slate-400 text-xs font-semibold pt-0.5">
            Bảo vệ nguồn tài sản dự trữ và tích lũy thông minh dài hạn.
          </p>
        </div>

        {/* Decorative Graphic Asset Badge */}
        <div className="hidden md:flex items-center gap-3 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent border border-emerald-500/20 px-4 py-2.5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.4)]">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-emerald-300">Bảo Vệ Tài Sản</span>
            <span className="text-[10px] text-slate-400 font-bold">An toàn & Phát triển</span>
          </div>
        </div>
      </div>

      {/* Top 2 Main Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Quỹ Dự Phòng (Green / Emerald Theme) */}
        <div className="bg-[#0c1914] border border-emerald-500/25 shadow-[0_0_30px_rgba(16,185,129,0.12)] p-6 rounded-3xl flex flex-col justify-between space-y-5 text-left relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="space-y-5">
            
            {/* Header info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Quỹ Dự Phòng</h3>
                  <p className="text-[10px] text-slate-400 font-medium leading-none mt-1">Dành cho tình huống khẩn cấp bất ngờ.</p>
                </div>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 rounded-full shrink-0 shadow-sm">
                Đạt {emPercent}%
              </span>
            </div>

            {/* Current Balance & Radial Circle */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">SỐ DƯ HIỆN TẠI</span>
                <p className="text-2xl sm:text-3xl font-black text-white leading-none tracking-tight">
                  {formatVND(emergencyCurrent)}
                </p>
              </div>

              {/* Radial SVG Circle Progress (Emerald) */}
              <RadialProgress percentage={emPercent} color="emerald" />
            </div>

            {/* Target & Progress display */}
            <div className="pt-2 border-t border-white/5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <div className="p-1 rounded-lg bg-emerald-500/15 text-emerald-400">
                    <Target className="h-3.5 w-3.5" />
                  </div>
                  <span className="uppercase text-[9px] font-black text-slate-400">MỤC TIÊU:</span>
                  <input
                    type="text"
                    value={formatNumberDots(emergencyTarget)}
                    onChange={(e) => {
                      saveEmergencyTarget(currentUser.id, parseNumberDots(e.target.value));
                    }}
                    className="w-28 bg-[#10231d] border border-emerald-500/30 rounded-lg px-2 py-0.5 text-xs font-black text-white text-right focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                  <span className="text-slate-400 text-[10px]">VND</span>
                </div>

                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase">TIẾN ĐỘ MỤC TIÊU</span>
                  <span className="text-xs font-black text-white mt-0.5">
                    {formatVND(emergencyCurrent)} / {formatVND(emergencyTarget)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Card 2: Quỹ Tích Lũy (Cyan Theme with Lucide TrendingUp Icon) */}
        <div className="bg-[#09151e] border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.12)] p-6 rounded-3xl flex flex-col justify-between space-y-5 text-left relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="space-y-5">
            
            {/* Header info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Quỹ Tích Lũy</h3>
                  <p className="text-[10px] text-slate-400 font-medium leading-none mt-1">Dành cho mục tiêu lớn đầu tư dài hạn.</p>
                </div>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 rounded-full shrink-0 shadow-sm">
                Đạt {acPercent}%
              </span>
            </div>

            {/* Current Balance & Radial Circle */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">SỐ DƯ HIỆN TẠI</span>
                <p className="text-2xl sm:text-3xl font-black text-white leading-none tracking-tight">
                  {formatVND(accumulationCurrent)}
                </p>
              </div>

              {/* Radial SVG Circle Progress (Cyan) */}
              <RadialProgress percentage={acPercent} color="cyan" />
            </div>

            {/* Target & Progress display */}
            <div className="pt-2 border-t border-white/5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <div className="p-1 rounded-lg bg-cyan-500/15 text-cyan-400">
                    <Target className="h-3.5 w-3.5" />
                  </div>
                  <span className="uppercase text-[9px] font-black text-slate-400">MỤC TIÊU:</span>
                  <input
                    type="text"
                    value={formatNumberDots(accumulationTarget)}
                    onChange={(e) => {
                      saveAccumulationTarget(currentUser.id, parseNumberDots(e.target.value));
                    }}
                    className="w-28 bg-[#0e1d29] border border-cyan-500/30 rounded-lg px-2 py-0.5 text-xs font-black text-white text-right focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                  <span className="text-slate-400 text-[10px]">VND</span>
                </div>

                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase">TIẾN ĐỘ MỤC TIÊU</span>
                  <span className="text-xs font-black text-white mt-0.5">
                    {formatVND(accumulationCurrent)} / {formatVND(accumulationTarget)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Bottom Split Layout: Left 2/3 (Lịch sử giao dịch - Purple Theme) + Right 1/3 (Tổng quan tài sản tiết kiệm) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 Width): Lịch sử giao dịch (Purple Theme) */}
        <div className="lg:col-span-2 bg-[#0a0d18] border border-purple-500/20 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-xl shadow-[0_0_10px_rgba(168,85,247,0.3)] shrink-0">
                <Activity className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                Lịch sử giao dịch
              </h3>
            </div>

            {/* Filter controls */}
            <div className="relative flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setFilterDropdownOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#121629] border border-purple-500/30 hover:border-purple-500/50 text-xs font-bold text-slate-300 rounded-xl cursor-pointer transition-all shadow-sm"
                >
                  <span>
                    {historyFilter === 'all' && 'Tất cả giao dịch'}
                    {historyFilter === 'emergency' && 'Quỹ Dự Phòng'}
                    {historyFilter === 'accumulation' && 'Quỹ Tích Lũy'}
                    {historyFilter === 'deposit' && 'Nạp vào quỹ'}
                    {historyFilter === 'withdraw' && 'Rút khỏi quỹ'}
                  </span>
                  <Filter className="h-3.5 w-3.5 text-purple-400" />
                </button>

                {filterDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 z-50 bg-[#0d101d] border border-purple-500/20 rounded-2xl p-2 w-48 shadow-2xl space-y-1 animate-mac-dropdown origin-top-right">
                    {[
                      { id: 'all', label: 'Tất cả giao dịch' },
                      { id: 'emergency', label: 'Quỹ Dự Phòng' },
                      { id: 'accumulation', label: 'Quỹ Tích Lũy' },
                      { id: 'deposit', label: 'Nạp vào quỹ' },
                      { id: 'withdraw', label: 'Rút khỏi quỹ' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setHistoryFilter(item.id as any);
                          setFilterDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                          historyFilter === item.id 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* History Item Rows (Clean without far-right arrow icons) */}
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-extrabold text-xs bg-[#101324]/50 border border-white/5 rounded-2xl">
                Chưa ghi nhận lịch sử nạp / rút tiết kiệm nào.
              </div>
            ) : (
              filteredHistory.map((h) => {
                const isDep = h.type === 'deposit';
                const isEmergency = h.fund === 'emergency';
                const fundTitle = isEmergency ? 'Quỹ Dự Phòng' : 'Quỹ Tích Lũy';

                return (
                  <div
                    key={h.id}
                    className="p-3.5 bg-[#121629]/80 border border-white/10 hover:border-purple-500/40 rounded-2xl flex items-center justify-between gap-4 transition-all hover:bg-[#161b33]"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`p-2.5 rounded-2xl border shrink-0 ${
                        isEmergency 
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.25)]' 
                          : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                      }`}>
                        {isEmergency ? <Shield className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                      </div>

                      <div className="flex flex-col text-left min-w-0">
                        <span className="font-extrabold text-xs text-white truncate">
                          {fundTitle}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          {h.date} • {isDep ? 'Nạp vào quỹ' : 'Rút khỏi quỹ'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end shrink-0 pr-2">
                      <span className={`text-xs font-black tracking-tight ${isDep ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isDep ? '+' : '-'}{formatVND(h.amount)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (1/3 Width): Tổng quan tài sản tiết kiệm (With Sleek Donut Pie Chart) */}
        <div className="bg-[#0a0d18] border border-white/10 rounded-3xl p-6 flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden">
          
          <div className="space-y-4">
            {/* Header without clock icon */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Tổng quan tài sản tiết kiệm
              </h3>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                TỔNG SỐ DƯ
              </span>
              <p className="text-3xl font-black text-white tracking-tight leading-none">
                {formatVND(totalSavingsBalance)}
              </p>
            </div>
          </div>

          {/* Sleek Donut Pie Chart */}
          <SleekDonutChart emergencyAmount={emergencyCurrent} accumulationAmount={accumulationCurrent} />

          {/* Action trigger button */}
          <button
            onClick={() => showToast(`Tổng tài sản tích lũy hiện tại: ${formatVND(totalSavingsBalance)}.`, 'info')}
            className="w-full py-3 px-4 bg-[#121629] hover:bg-[#171c35] border border-white/10 hover:border-purple-500/40 text-xs font-extrabold text-white rounded-2xl flex items-center justify-between transition-all cursor-pointer shadow-md group mt-auto"
          >
            <span>Xem báo cáo chi tiết</span>
            <ChevronRight className="h-4 w-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

        </div>

      </div>
    </div>
  );
}

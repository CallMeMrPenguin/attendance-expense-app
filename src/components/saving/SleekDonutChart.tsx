import React from 'react';

interface SleekDonutChartProps {
  emergencyAmount: number;
  accumulationAmount: number;
}

export const SleekDonutChart: React.FC<SleekDonutChartProps> = ({ emergencyAmount, accumulationAmount }) => {
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

        {/* Center Ratio Display */}
        <div className="absolute flex items-center justify-center text-center">
          <span className="text-xl font-black text-white leading-none">{emShare}% / {acShare}%</span>
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

export default SleekDonutChart;

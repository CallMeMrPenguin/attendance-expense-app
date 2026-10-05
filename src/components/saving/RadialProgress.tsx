import React from 'react';

interface RadialProgressProps {
  percentage: number;
  color: 'emerald' | 'cyan';
}

export const RadialProgress: React.FC<RadialProgressProps> = ({ percentage, color }) => {
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

export default RadialProgress;

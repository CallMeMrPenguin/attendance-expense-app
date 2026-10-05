import React, { useState, useRef, useEffect } from 'react';
import { 
  BarChart3, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut 
} from 'lucide-react';
import { formatVND } from '@/lib/utils';

export interface ChartSeriesItem {
  title: string;
  colorIndex: number;
  incomeColor: string;
  expenseColor: string;
  points: Array<{ label: string; income: number; expense: number }>;
}

export interface ChartDataModel {
  xLabels: string[];
  maxVal: number;
  series: ChartSeriesItem[];
}

interface DashboardTrendChartProps {
  viewMode: 'days' | 'weeks' | 'months' | 'years';
  setViewMode: (mode: 'days' | 'weeks' | 'months' | 'years') => void;
  selectedYears: number[];
  toggleYearSelection: (yr: number) => void;
  chartYear: number;
  chartSelectedMonths: string[];
  toggleChartMonth: (mStr: string) => void;
  chartDataModel: ChartDataModel;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
}

export function DashboardTrendChart({
  viewMode,
  setViewMode,
  selectedYears,
  toggleYearSelection,
  chartYear,
  chartSelectedMonths,
  toggleChartMonth,
  chartDataModel,
  handleZoomIn,
  handleZoomOut,
}: DashboardTrendChartProps) {
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState<{
    pointIndex: number;
    svgX: number;
    svgY: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(900);

  useEffect(() => {
    const updateWidth = () => {
      if (chartContainerRef.current) {
        setContainerWidth(Math.max(chartContainerRef.current.clientWidth, 600));
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (chartContainerRef.current) observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Dynamic Canvas Dimensions matching container width (560px height per Rule 5)
  const chartHeight = 560;
  const chartWidth = Math.max(chartContainerRef.current?.offsetWidth || containerWidth, 600);
  const paddingLeft = 55;
  const paddingRight = 40;
  const paddingTop = 40;
  const paddingBottom = 60;

  const plotAreaWidth = chartWidth - paddingLeft - paddingRight;
  const plotAreaHeight = chartHeight - paddingTop - paddingBottom;
  const BASE_Y = chartHeight - paddingBottom;
  const TOP_Y = paddingTop;

  const numXPoints = chartDataModel.xLabels.length;

  const getXCoordinate = (pointIndex: number) => {
    if (numXPoints <= 1) return paddingLeft + plotAreaWidth / 2;
    return paddingLeft + pointIndex * (plotAreaWidth / (numXPoints - 1));
  };

  const getYCoordinate = (val: number, maxVal: number) => {
    return BASE_Y - (val / Math.max(1, maxVal)) * plotAreaHeight;
  };

  const getCurvyPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const dx = p1.x - p0.x;
      d += ` C ${p0.x + dx / 2} ${p0.y}, ${p0.x + dx / 2} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const getAreaPath = (pts: { x: number; y: number }[]) => {
    const linePath = getCurvyPath(pts);
    if (!linePath) return '';
    return `${linePath} L ${pts[pts.length - 1].x} ${BASE_Y} L ${pts[0].x} ${BASE_Y} Z`;
  };

  // Precision Mouse Move Handler
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || numXPoints === 0 || chartDataModel.series.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * chartWidth;
    const mouseY = ((e.clientY - rect.top) / rect.height) * chartHeight;

    let minDistance = Infinity;
    let closestIndex = -1;
    let closestPtX = 0;
    let closestPtY = 0;

    chartDataModel.series.forEach(seriesItem => {
      seriesItem.points.forEach((p, pIdx) => {
        const ptX = getXCoordinate(pIdx);
        const incY = getYCoordinate(p.income, chartDataModel.maxVal);
        const expY = getYCoordinate(p.expense, chartDataModel.maxVal);

        const dInc = Math.hypot(mouseX - ptX, mouseY - incY);
        const dExp = Math.hypot(mouseX - ptX, mouseY - expY);

        if (dInc < minDistance) {
          minDistance = dInc;
          closestIndex = pIdx;
          closestPtX = ptX;
          closestPtY = incY;
        }
        if (dExp < minDistance) {
          minDistance = dExp;
          closestIndex = pIdx;
          closestPtX = ptX;
          closestPtY = expY;
        }
      });
    });

    if (minDistance <= 60 && closestIndex !== -1) {
      setHoveredNodeInfo({
        pointIndex: closestIndex,
        svgX: closestPtX,
        svgY: closestPtY
      });
    } else {
      setHoveredNodeInfo(null);
    }
  };

  return (
    <div className="calendar-container-depth p-6 bg-[#111422] flex flex-col justify-between space-y-5 text-left rounded-3xl border border-indigo-500/30 shadow-[0_0_30px_rgba(92,54,245,0.15)]">
      {/* MERGED CONTROL HEADER */}
      <div className="space-y-4 border-b border-white/5 pb-4 select-none">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-[0_0_12px_rgba(92,54,245,0.4)]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white text-glow-purple uppercase tracking-wider">Xu Hướng Thu Nhập & Chi Tiêu Multiline</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Đối chiếu đường thu chi qua 4 chế độ xem</p>
            </div>
          </div>

          {/* 4 View Modes Animated Sliding Pill Background Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex bg-[#090b14] border border-white/10 p-1 rounded-xl w-full sm:w-auto min-w-[320px]">
              <div
                className="absolute top-1 bottom-1 rounded-[10px] bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_0_14px_rgba(92,54,245,0.6)] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none"
                style={{
                  left: '4px',
                  width: 'calc(25% - 2px)',
                  transform:
                    viewMode === 'days'
                      ? 'translateX(0)'
                      : viewMode === 'weeks'
                      ? 'translateX(100%)'
                      : viewMode === 'months'
                      ? 'translateX(200%)'
                      : 'translateX(300%)',
                }}
              />
              {(['days', 'weeks', 'months', 'years'] as const).map(mode => {
                const labels: Record<string, string> = {
                  days: 'Theo Ngày',
                  weeks: 'Theo Tuần',
                  months: 'Theo Tháng',
                  years: 'Theo Năm'
                };
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`relative z-10 flex-1 py-1.5 text-[10px] font-black tracking-wider uppercase rounded-lg transition-colors duration-300 cursor-pointer ${
                      viewMode === mode ? 'text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>

            {/* Multi-Year Selection Chips */}
            {(viewMode === 'months' || viewMode === 'years') && (
              <div className="flex items-center gap-1.5 border border-white/10 rounded-xl p-1 bg-[#090b14]">
                <button 
                  onClick={() => toggleYearSelection(chartYear - 1)}
                  className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Thêm năm trước"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                
                {[2024, 2025, 2026, 2027].map(yr => {
                  const isYrActive = selectedYears.includes(yr);
                  return (
                    <button
                      key={yr}
                      onClick={() => toggleYearSelection(yr)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        isYrActive 
                          ? 'bg-indigo-500 text-white shadow-[0_0_8px_rgba(92,54,245,0.6)]' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {yr}
                    </button>
                  );
                })}

                <button 
                  onClick={() => toggleYearSelection(chartYear + 1)}
                  className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Thêm năm sau"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Zoom Buttons */}
            <div className="flex items-center gap-1 bg-[#090b14] border border-white/10 rounded-xl p-1">
              <button
                onClick={handleZoomIn}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Integrated 12-Month Selector Buttons */}
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 pt-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const mStr = `${chartYear}-${String(m).padStart(2, '0')}`;
            const isSelected = chartSelectedMonths.includes(mStr);
            return (
              <button
                key={m}
                onClick={() => toggleChartMonth(mStr)}
                className={`py-2 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#6440f6] to-[#4b25e3] text-white shadow-[0_0_16px_rgba(92,54,245,0.5)] border border-indigo-400/50 scale-[1.02]'
                    : 'bg-[#0a0d17] text-slate-400 hover:bg-white/[0.06] hover:text-white border border-white/5'
                }`}
              >
                T.{m}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        {chartDataModel.series.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-extrabold border-t border-white/5">
            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Chú thích:</span>
            {chartDataModel.series.map((s, idx) => (
              <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#080a14] border border-white/10 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.incomeColor, boxShadow: `0 0 6px ${s.incomeColor}` }}></span>
                <span className="text-slate-200">{s.title} (Thu)</span>
                <span className="text-slate-600">|</span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.expenseColor, boxShadow: `0 0 6px ${s.expenseColor}` }}></span>
                <span className="text-slate-200">(Chi)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Responsive Full-Width SVG Visual Canvas (560px Height) */}
      <div ref={chartContainerRef} className="w-full overflow-hidden relative py-2">
        {chartDataModel.series.length === 0 ? (
          <div className="h-[560px] flex items-center justify-center text-xs text-slate-500 font-bold bg-[#0b0e18] rounded-2xl border border-white/5">
            Vui lòng chọn ít nhất một tháng hoặc năm ở bộ lọc ở trên để hiển thị biểu đồ.
          </div>
        ) : (
          <div className="relative w-full">
            <svg 
              ref={svgRef}
              className="w-full overflow-visible" 
              style={{ height: `${chartHeight}px` }}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={() => setHoveredNodeInfo(null)}
            >
              <defs>
                {/* Expanded Filter Bounds (300% width/height to eliminate square edge clipping! Rule 5) */}
                <filter id="glow-dash-emerald" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glow-dash-rose" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glow-dash-cyan" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {chartDataModel.series.map((s, idx) => (
                  <React.Fragment key={idx}>
                    <linearGradient id={`incGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.incomeColor} stopOpacity="0.35" />
                      <stop offset="70%" stopColor={s.incomeColor} stopOpacity="0.08" />
                      <stop offset="100%" stopColor={s.incomeColor} stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id={`expGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.expenseColor} stopOpacity="0.35" />
                      <stop offset="70%" stopColor={s.expenseColor} stopOpacity="0.08" />
                      <stop offset="100%" stopColor={s.expenseColor} stopOpacity="0.0" />
                    </linearGradient>
                  </React.Fragment>
                ))}
              </defs>

              {/* Horizontal Grid Guidelines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = BASE_Y - ratio * plotAreaHeight;
                const val = chartDataModel.maxVal * ratio;
                return (
                  <g key={idx}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeWidth="1"
                      strokeDasharray={ratio === 0 ? "0" : "4 4"}
                    />
                    <text
                      x={paddingLeft - 10}
                      y={y + 4}
                      fill="#64748b"
                      fontSize="11"
                      fontWeight="800"
                      textAnchor="end"
                    >
                      {val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : formatVND(val)}
                    </text>
                  </g>
                );
              })}

              {/* Vertical Guideline on Hover */}
              {hoveredNodeInfo && (
                <line
                  x1={getXCoordinate(hoveredNodeInfo.pointIndex)}
                  y1={TOP_Y}
                  x2={getXCoordinate(hoveredNodeInfo.pointIndex)}
                  y2={BASE_Y}
                  stroke="rgba(99, 102, 241, 0.8)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {/* Render Series Curves */}
              {chartDataModel.series.map((seriesItem, sIdx) => {
                const incPoints = seriesItem.points.map((p, pIdx) => ({
                  x: getXCoordinate(pIdx),
                  y: getYCoordinate(p.income, chartDataModel.maxVal)
                }));

                const expPoints = seriesItem.points.map((p, pIdx) => ({
                  x: getXCoordinate(pIdx),
                  y: getYCoordinate(p.expense, chartDataModel.maxVal)
                }));

                return (
                  <g key={sIdx}>
                    {/* Area Fill */}
                    {chartDataModel.series.length === 1 && (
                      <>
                        <path d={getAreaPath(incPoints)} fill={`url(#incGrad-${sIdx})`} pointerEvents="none" />
                        <path d={getAreaPath(expPoints)} fill={`url(#expGrad-${sIdx})`} pointerEvents="none" />
                      </>
                    )}

                    {/* Smooth Curves */}
                    <path
                      d={getCurvyPath(incPoints)}
                      fill="none"
                      stroke={seriesItem.incomeColor}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ filter: `drop-shadow(0 0 10px ${seriesItem.incomeColor})` }}
                    />
                    <path
                      d={getCurvyPath(expPoints)}
                      fill="none"
                      stroke={seriesItem.expenseColor}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ filter: `drop-shadow(0 0 10px ${seriesItem.expenseColor})` }}
                    />

                    {/* Data Points */}
                    {seriesItem.points.map((pt, pIdx) => {
                      const isHovered = hoveredNodeInfo?.pointIndex === pIdx;
                      const incPt = incPoints[pIdx];
                      const expPt = expPoints[pIdx];

                      return (
                        <g key={pIdx}>
                          {/* Income Point (Rule 5 center origin) */}
                          <circle
                            cx={incPt.x}
                            cy={incPt.y}
                            r={isHovered ? "7" : "4.5"}
                            fill="#0d1018"
                            stroke={seriesItem.incomeColor}
                            strokeWidth={isHovered ? "3.5" : "2.5"}
                            className="transition-all duration-200 cursor-pointer"
                            style={{
                              transformBox: 'fill-box',
                              transformOrigin: 'center',
                              filter: `drop-shadow(0 0 8px ${seriesItem.incomeColor})`
                            }}
                          />

                          {/* Expense Point (Rule 5 center origin) */}
                          <circle
                            cx={expPt.x}
                            cy={expPt.y}
                            r={isHovered ? "7" : "4.5"}
                            fill="#0d1018"
                            stroke={seriesItem.expenseColor}
                            strokeWidth={isHovered ? "3.5" : "2.5"}
                            className="transition-all duration-200 cursor-pointer"
                            style={{
                              transformBox: 'fill-box',
                              transformOrigin: 'center',
                              filter: `drop-shadow(0 0 8px ${seriesItem.expenseColor})`
                            }}
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* X-Axis Baseline */}
              <line x1={paddingLeft} y1={BASE_Y} x2={chartWidth - paddingRight} y2={BASE_Y} stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />

              {/* X-Axis Reference Point Labels */}
              {chartDataModel.xLabels.map((lbl, idx) => {
                const x = getXCoordinate(idx);
                const isHovered = hoveredNodeInfo?.pointIndex === idx;
                return (
                  <text
                    key={idx}
                    x={x}
                    y={BASE_Y + 24}
                    fill={isHovered ? "#ffffff" : "#94a3b8"}
                    fontSize={viewMode === 'days' && numXPoints > 20 ? "9" : "11"}
                    fontWeight={isHovered ? "900" : "800"}
                    textAnchor="middle"
                  >
                    {lbl}
                  </text>
                );
              })}
            </svg>

            {/* Floating Tooltip Card */}
            {hoveredNodeInfo && chartDataModel.series.length > 0 && (
              <div 
                className="absolute top-4 bg-[#0c0f1d] border border-indigo-500/40 rounded-2xl p-4 shadow-2xl animate-mac-dropdown text-xs space-y-2 z-30 pointer-events-none min-w-[200px]"
                style={{
                  left: `${Math.min(Math.max(hoveredNodeInfo.svgX, 100), chartWidth - 220)}px`
                }}
              >
                <span className="font-black text-indigo-300 block border-b border-white/10 pb-1.5 uppercase tracking-wider text-[11px]">
                  {chartDataModel.xLabels[hoveredNodeInfo.pointIndex]}
                </span>

                <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                  {chartDataModel.series.map((sItem, sIdx) => {
                    const pt = sItem.points[hoveredNodeInfo.pointIndex];
                    if (!pt) return null;
                    const surplus = pt.income - pt.expense;
                    return (
                      <div key={sIdx} className="space-y-1 bg-[#080b15] p-2.5 rounded-xl border border-white/10 shadow-inner">
                        <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">{sItem.title}</span>
                        <div className="flex items-center justify-between gap-4 text-emerald-400 font-black">
                          <span>Thu nhập:</span>
                          <span>{formatVND(pt.income)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-rose-400 font-black">
                          <span>Chi tiêu:</span>
                          <span>{formatVND(pt.expense)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-cyan-400 font-black border-t border-white/5 pt-1 mt-1">
                          <span>Thặng dư:</span>
                          <span className={surplus >= 0 ? 'text-cyan-400' : 'text-rose-400'}>{formatVND(surplus)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

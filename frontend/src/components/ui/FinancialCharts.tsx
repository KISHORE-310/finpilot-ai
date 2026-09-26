"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/utils";

// ============================================================
// 1. CASH FLOW & NET WORTH AREA TRAJECTORY CHART (Pure SVG)
// ============================================================
export interface TrajectoryPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  date?: string;
}

interface AreaTrajectoryChartProps {
  data: TrajectoryPoint[];
  height?: number;
  valuePrefix?: string;
  currency?: string;
  showSecondary?: boolean;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPeriodChange?: (period: string) => void;
  activePeriod?: string;
  periods?: string[];
}

export function AreaTrajectoryChart({
  data,
  height = 240,
  currency = "INR",
  showSecondary = false,
  primaryLabel = "Net Worth",
  secondaryLabel = "Cash Flow",
  onPeriodChange,
  activePeriod = "6M",
  periods = ["1M", "3M", "6M", "1Y", "ALL"],
}: AreaTrajectoryChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center p-8 bg-[#0a0c14]/40 rounded-xl border border-slate-800/80 text-slate-500 text-xs text-center"
        style={{ height }}
      >
        <p>No time-series data recorded for this duration.</p>
        <p className="text-[11px] text-slate-600 mt-1">Record transactions or capture net worth snapshots to plot trajectory.</p>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const secondaryValues = showSecondary ? data.map((d) => d.secondaryValue || 0) : [];
  const allValues = [...values, ...secondaryValues];

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const range = rawMax - rawMin === 0 ? 1 : rawMax - rawMin;
  const padding = range * 0.15;
  const minY = Math.min(0, rawMin - padding);
  const maxY = rawMax + padding;

  const width = 800; // SVG coordinate viewBox width
  const svgHeight = height;
  const graphPaddingTop = 20;
  const graphPaddingBottom = 30;
  const graphHeight = svgHeight - graphPaddingTop - graphPaddingBottom;

  const getX = (index: number) => {
    if (data.length <= 1) return width / 2;
    return (index / (data.length - 1)) * (width - 40) + 20;
  };

  const getY = (val: number) => {
    return svgHeight - graphPaddingBottom - ((val - minY) / (maxY - minY)) * graphHeight;
  };

  // Build SVG path
  const primaryPoints = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(" ");
  const primaryAreaPath = `M ${getX(0)},${getY(minY)} L ${primaryPoints} L ${getX(data.length - 1)},${getY(minY)} Z`;

  const hoveredItem = hoveredIdx !== null ? data[hoveredIdx] : data[data.length - 1];

  return (
    <div className="space-y-4">
      {/* Header controls & live metric readout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {formatCurrency(hoveredItem?.value ?? 0, currency)}
            </span>
            {showSecondary && hoveredItem?.secondaryValue !== undefined && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                +{formatCurrency(hoveredItem.secondaryValue, currency)}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {hoveredItem?.date ? `Record date: ${hoveredItem.date}` : hoveredItem?.label}
          </p>
        </div>

        {onPeriodChange && (
          <div className="flex items-center gap-1 bg-[#0a0c14] p-1 rounded-xl border border-slate-800/90 self-start sm:self-auto">
            {periods.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPeriodChange(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  activePeriod === p
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SVG Container */}
      <div className="relative w-full overflow-hidden bg-[#0a0c14]/40 rounded-xl border border-slate-800/60 p-2">
        <svg
          viewBox={`0 0 ${width} ${svgHeight}`}
          className="w-full h-auto block select-none"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="primaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="primaryLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1="20"
            y1={getY(0)}
            x2={width - 20}
            y2={getY(0)}
            stroke="#1e293b"
            strokeDasharray="4 4"
            strokeWidth="1"
          />

          {/* Area fill */}
          <path d={primaryAreaPath} fill="url(#primaryAreaGrad)" />

          {/* Line stroke */}
          <path
            d={`M ${primaryPoints}`}
            fill="none"
            stroke="url(#primaryLineGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive touch/hover markers */}
          {data.map((d, i) => {
            const x = getX(i);
            const y = getY(d.value);
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onClick={() => setHoveredIdx(i)}
              >
                {/* Hit area */}
                <rect
                  x={x - (width / data.length) / 2}
                  y="0"
                  width={width / data.length}
                  height={svgHeight}
                  fill="transparent"
                />

                {isHovered && (
                  <line
                    x1={x}
                    y1={graphPaddingTop}
                    x2={x}
                    y2={svgHeight - graphPaddingBottom}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 5 : 2.5}
                  className={`transition-all ${
                    isHovered
                      ? "fill-blue-400 stroke-[#111420] stroke-[3]"
                      : "fill-blue-500/60"
                  }`}
                />
              </g>
            );
          })}

          {/* X Axis Labels */}
          {data.map((d, i) => {
            if (data.length > 7 && i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) {
              return null;
            }
            return (
              <text
                key={i}
                x={getX(i)}
                y={svgHeight - 8}
                textAnchor="middle"
                className="text-[10px] fill-slate-500 font-mono select-none"
              >
                {d.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>{primaryLabel}</span>
        </div>
        {showSecondary && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>{secondaryLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 2. DONUT ASSET ALLOCATION CHART (Pure SVG)
// ============================================================
export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  percentage?: number;
}

interface DonutAllocationChartProps {
  segments: DonutSegment[];
  totalValue: number;
  centerLabel?: string;
  currency?: string;
}

export function DonutAllocationChart({
  segments,
  totalValue,
  centerLabel = "Portfolio Total",
  currency = "INR",
}: DonutAllocationChartProps) {
  if (!segments || segments.length === 0 || totalValue <= 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-[#0a0c14]/40 rounded-xl border border-slate-800">
        No asset allocations recorded.
      </div>
    );
  }

  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
      {/* SVG Donut */}
      <div className="relative w-48 h-48 shrink-0">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          {/* Base background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />

          {segments.map((seg, idx) => {
            const pct = seg.percentage ?? (totalValue > 0 ? (seg.value / totalValue) * 100 : 0);
            const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
            accumulatedPercent += pct;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 hover:opacity-80"
              />
            );
          })}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{centerLabel}</span>
          <span className="text-sm font-bold font-mono text-white mt-0.5">
            {formatCurrency(totalValue, currency)}
          </span>
        </div>
      </div>

      {/* Segments Legend */}
      <div className="flex-1 space-y-2.5 w-full">
        {segments.map((seg, idx) => {
          const pct = seg.percentage ?? (totalValue > 0 ? (seg.value / totalValue) * 100 : 0);
          return (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="text-slate-300 font-medium truncate capitalize">{seg.label}</span>
              </div>
              <div className="text-right font-mono shrink-0 ml-2">
                <span className="text-white font-semibold">{formatCurrency(seg.value, currency)}</span>
                <span className="text-slate-500 text-[11px] ml-1.5 font-normal">({pct.toFixed(1)}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 3. 50/30/20 BUDGET RULE STACKED BAR
// ============================================================
interface BudgetRuleProps {
  needsSpent: number;
  wantsSpent: number;
  savingsSpent: number;
  totalIncome: number;
  currency?: string;
}

export function FiftyThirtyTwentyRuleBar({
  needsSpent,
  wantsSpent,
  savingsSpent,
  totalIncome,
  currency = "INR",
}: BudgetRuleProps) {
  const base = totalIncome > 0 ? totalIncome : needsSpent + wantsSpent + savingsSpent || 1;
  const needsPct = Math.min(100, Math.round((needsSpent / base) * 100));
  const wantsPct = Math.min(100, Math.round((wantsSpent / base) * 100));
  const savingsPct = Math.min(100, Math.round((savingsSpent / base) * 100));

  return (
    <div className="bg-[#111420] border border-slate-800/90 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">50 / 30 / 20 Budget Allocation Rule</h3>
          <p className="text-xs text-slate-400 mt-0.5">Essential Needs (50%) • Discretionary (30%) • Wealth Savings (20%)</p>
        </div>
      </div>

      {/* Multi-segment stacked bar */}
      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
        <div style={{ width: `${needsPct}%` }} className="bg-blue-500 h-full transition-all" title={`Needs: ${needsPct}%`} />
        <div style={{ width: `${wantsPct}%` }} className="bg-amber-500 h-full transition-all" title={`Wants: ${wantsPct}%`} />
        <div style={{ width: `${savingsPct}%` }} className="bg-emerald-500 h-full transition-all" title={`Savings: ${savingsPct}%`} />
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
        <div className="p-3 bg-[#0a0c14] border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Needs (Target 50%)
            </span>
            <span className="font-mono text-slate-300 font-bold">{needsPct}%</span>
          </div>
          <p className="font-mono text-white text-sm font-bold">{formatCurrency(needsSpent, currency)}</p>
        </div>

        <div className="p-3 bg-[#0a0c14] border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Wants (Target 30%)
            </span>
            <span className="font-mono text-slate-300 font-bold">{wantsPct}%</span>
          </div>
          <p className="font-mono text-white text-sm font-bold">{formatCurrency(wantsSpent, currency)}</p>
        </div>

        <div className="p-3 bg-[#0a0c14] border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Savings (Target 20%)
            </span>
            <span className="font-mono text-slate-300 font-bold">{savingsPct}%</span>
          </div>
          <p className="font-mono text-white text-sm font-bold">{formatCurrency(savingsSpent, currency)}</p>
        </div>
      </div>
    </div>
  );
}

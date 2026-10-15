'use client';

import React, { useState, useMemo } from 'react';
import { Activity, TrendingUp, Zap, Calendar } from 'lucide-react';

import { UsageChartDataPoint } from '../../lib/api';

interface TelemetryPoint {
  date: string;
  day: string;
  tokens: number;
  requests: number;
  costMinor: number;
}

interface UsageTelemetryChartProps {
  chartData?: UsageChartDataPoint[];
  loading?: boolean;
}

export function UsageTelemetryChart({ chartData = [], loading = false }: UsageTelemetryChartProps) {
  const [metric, setMetric] = useState<'tokens' | 'requests'>('tokens');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Real 14-day telemetry data from PostgreSQL usage_records
  const data: TelemetryPoint[] = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      const points: TelemetryPoint[] = [];
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        points.push({
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          day: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
          tokens: 0,
          requests: 0,
          costMinor: 0,
        });
      }
      return points;
    }

    return chartData.map((pt) => {
      const parts = (pt.date || '').split('-');
      const d = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(pt.date);
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        day: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        tokens: Number(pt.totalTokens ?? 0),
        requests: Number(pt.queries ?? 0),
        costMinor: Number(pt.costMinor ?? 0),
      };
    });
  }, [chartData]);

  const maxVal = useMemo(() => {
    const vals = data.map((d) => (metric === 'tokens' ? d.tokens : d.requests));
    return Math.max(...vals, 10);
  }, [data, metric]);

  const totalPeriodTokens = useMemo(() => data.reduce((acc, d) => acc + d.tokens, 0), [data]);
  const totalPeriodRequests = useMemo(() => data.reduce((acc, d) => acc + d.requests, 0), [data]);
  const totalPeriodCostMinor = useMemo(() => data.reduce((acc, d) => acc + d.costMinor, 0), [data]);

  // SVG dimensions
  const svgWidth = 640;
  const svgHeight = 140;
  const paddingX = 20;
  const paddingY = 15;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  // Compute coordinates
  const points = useMemo(() => {
    return data.map((d, i) => {
      const x = paddingX + (i / (data.length - 1)) * chartWidth;
      const val = metric === 'tokens' ? d.tokens : d.requests;
      const y = paddingY + chartHeight - (val / maxVal) * chartHeight;
      return { x, y, data: d };
    });
  }, [data, metric, maxVal, chartWidth, chartHeight, paddingX, paddingY]);

  // Construct SVG paths
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      // Smooth cubic curve interpolation
      const prev = points[i - 1];
      const cx1 = prev.x + (p.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (p.x - prev.x) / 2;
      const cy2 = p.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
    }, '');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x} ${svgHeight - paddingY} L ${first.x} ${svgHeight - paddingY} Z`;
  }, [linePath, points, svgHeight, paddingY]);

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[points.length - 1];

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-zinc-800/60">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">
              Inference & Token Consumption Telemetry
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              14-Day Rolling
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Real-time grounding queries and Gemini Flash token utilization across workspace assistants.
          </p>
        </div>

        {/* Metric Selector Controls */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 self-start sm:self-auto">
          <button
            onClick={() => setMetric('tokens')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              metric === 'tokens'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Tokens
          </button>
          <button
            onClick={() => setMetric('requests')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              metric === 'requests'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Inference Calls
          </button>
        </div>
      </div>

      {/* KPI Ticker Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Period Tokens</span>
          <div className="text-sm font-semibold text-zinc-100 font-mono mt-0.5">
            {totalPeriodTokens.toLocaleString()}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Queries Handled</span>
          <div className="text-sm font-semibold text-zinc-100 font-mono mt-0.5">
            {totalPeriodRequests.toLocaleString()}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Period Spend</span>
          <div className="text-sm font-semibold text-emerald-400 font-mono mt-0.5">
            ₹{(totalPeriodCostMinor / 100).toFixed(2)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">Telemetry Hover</span>
          <div className="text-sm font-semibold text-blue-400 font-mono mt-0.5 truncate">
            {activePoint ? `${activePoint.data.date}: ${metric === 'tokens' ? `${activePoint.data.tokens} tokens` : `${activePoint.data.requests} calls`}` : '—'}
          </div>
        </div>
      </div>

      {/* Responsive SVG Chart Stage */}
      <div className="relative pt-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-36 overflow-visible select-none"
        >
          <defs>
            <linearGradient id="telemetryGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={svgWidth - paddingX}
            y2={paddingY}
            stroke="#27272a"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <line
            x1={paddingX}
            y1={paddingY + chartHeight / 2}
            x2={svgWidth - paddingX}
            y2={paddingY + chartHeight / 2}
            stroke="#27272a"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <line
            x1={paddingX}
            y1={svgHeight - paddingY}
            x2={svgWidth - paddingX}
            y2={svgHeight - paddingY}
            stroke="#27272a"
            strokeWidth="1"
          />

          {/* Filled Area */}
          <path d={areaPath} fill="url(#telemetryGradient)" />

          {/* Stroke Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data Points & Hover Targets */}
          {points.map((p, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g key={idx}>
                {/* Large Invisible Hover Hit Target */}
                <rect
                  x={p.x - 14}
                  y={0}
                  width={28}
                  height={svgHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Vertical guide line on hover */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={paddingY}
                    x2={p.x}
                    y2={svgHeight - paddingY}
                    stroke="#60a5fa"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 4.5 : 2.5}
                  fill={isHovered ? '#60a5fa' : '#3b82f6'}
                  stroke="#090a0f"
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>

        {/* X-Axis Date Labels */}
        <div className="flex justify-between px-3 pt-1 text-[10px] font-mono text-zinc-400 select-none">
          <span>{data[0]?.date}</span>
          <span className="hidden sm:inline">{data[Math.floor(data.length / 2)]?.date}</span>
          <span>{data[data.length - 1]?.date} (Today)</span>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import type { SignalEvaluation } from "@/api";

interface PointsChartProps {
  evaluations: SignalEvaluation[];
}

export function PointsChart({ evaluations }: PointsChartProps) {
  const chartData = useMemo(() => {
    if (evaluations.length === 0) {
      return { points: [], min: 0, max: 0 };
    }

    // Sort by date ascending and calculate cumulative points
    const sorted = [...evaluations].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let cumulative = 0;
    const points = sorted.map((e, i) => {
      cumulative += e.pointsAwarded;
      return { index: i, value: cumulative, success: e.success };
    });

    const values = points.map((p) => p.value);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);

    return { points, min, max };
  }, [evaluations]);

  if (evaluations.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        need more evaluations to show chart
      </div>
    );
  }

  const { points, min, max } = chartData;
  const range = max - min || 1;
  const width = 400;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scale functions
  const xScale = (index: number) =>
    padding.left + (index / (points.length - 1)) * chartWidth;
  const yScale = (value: number) =>
    padding.top + chartHeight - ((value - min) / range) * chartHeight;

  // Generate path
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.index)} ${yScale(p.value)}`)
    .join(" ");

  // Zero line position
  const zeroY = yScale(0);

  // Y-axis labels
  const yLabels = [max, 0, min].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-32 w-full"
    >
      {/* Grid lines */}
      <line
        x1={padding.left}
        y1={zeroY}
        x2={width - padding.right}
        y2={zeroY}
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeDasharray="2 2"
      />

      {/* Y-axis labels */}
      {yLabels.map((label) => (
        <text
          key={label}
          x={padding.left - 6}
          y={yScale(label)}
          textAnchor="end"
          dominantBaseline="middle"
          className="fill-muted-foreground"
          fontSize={10}
        >
          {label > 0 ? `+${label}` : label}
        </text>
      ))}

      {/* Area fill */}
      <path
        d={`${linePath} L ${xScale(points.length - 1)} ${zeroY} L ${xScale(0)} ${zeroY} Z`}
        fill="currentColor"
        fillOpacity={0.05}
        className="text-primary"
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />

      {/* Points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={xScale(p.index)}
          cy={yScale(p.value)}
          r={4}
          className={p.success ? "fill-emerald-500" : "fill-red-500"}
        />
      ))}

      {/* X-axis label */}
      <text
        x={width / 2}
        y={height - 4}
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize={10}
      >
        evaluations ({points.length})
      </text>
    </svg>
  );
}

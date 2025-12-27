import { useMemo } from "react";
import type { EvaluationHistoryItem } from "@/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { format } from "date-fns";

interface PointsProgressionChartProps {
  evaluations: EvaluationHistoryItem[];
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  points: number;
  change: number;
}

export function PointsProgressionChart({
  evaluations,
}: PointsProgressionChartProps) {
  const chartData = useMemo(() => {
    if (evaluations.length === 0) {
      return [];
    }

    // Sort by date ascending
    const sorted = [...evaluations].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let cumulative = 0;
    const data: ChartDataPoint[] = sorted.map((e) => {
      cumulative += e.pointsAwarded;
      return {
        date: e.createdAt.toString(),
        displayDate: format(new Date(e.createdAt), "MMM d"),
        points: cumulative,
        change: e.pointsAwarded,
      };
    });

    return data;
  }, [evaluations]);

  if (evaluations.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        // need more evaluations to show progression
      </div>
    );
  }

  const minValue = Math.min(0, ...chartData.map((d) => d.points));
  const maxValue = Math.max(0, ...chartData.map((d) => d.points));

  // Determine if overall trend is positive or negative
  const finalPoints = chartData[chartData.length - 1]?.points ?? 0;
  const gradientColor = finalPoints >= 0 ? "#10b981" : "#ef4444";
  const strokeColor = finalPoints >= 0 ? "#10b981" : "#ef4444";

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
      >
        <defs>
          <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="displayDate"
          axisLine={{ stroke: "#525252" }}
          tickLine={{ stroke: "#525252" }}
          tick={{ fontSize: 9, fill: "#a3a3a3" }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minValue, maxValue]}
          axisLine={{ stroke: "#525252" }}
          tickLine={{ stroke: "#525252" }}
          tick={{ fontSize: 9, fill: "#a3a3a3" }}
          tickFormatter={(value) => (value > 0 ? `+${value}` : `${value}`)}
          width={35}
          allowDecimals={false}
        />
        <ReferenceLine y={0} stroke="#525252" strokeDasharray="3 3" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 0,
            fontSize: 11,
            color: "hsl(var(--foreground))",
          }}
          formatter={(value, _name) => {
            const numValue = typeof value === "number" ? value : 0;
            const formatted = numValue > 0 ? `+${numValue}` : `${numValue}`;
            return [formatted, "Total points"];
          }}
        />
        <Area
          type="monotone"
          dataKey="points"
          stroke={strokeColor}
          strokeWidth={2}
          fill="url(#pointsGradient)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

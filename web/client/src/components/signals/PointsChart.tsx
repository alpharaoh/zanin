import { useMemo } from "react";
import type { SignalEvaluation } from "@/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface PointsChartProps {
  evaluations: SignalEvaluation[];
}

interface ChartDataPoint {
  index: number;
  value: number;
  success: boolean;
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}

const renderDot = (props: DotProps) => {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) {
    return <></>;
  }
  return (
    <circle
      key={`dot-${cx}-${cy}`}
      cx={cx}
      cy={cy}
      r={4}
      fill={payload.success ? "#10b981" : "#ef4444"}
    />
  );
};

export function PointsChart({ evaluations }: PointsChartProps) {
  const chartData = useMemo(() => {
    if (evaluations.length === 0) {
      return [];
    }

    // Sort by date ascending and calculate cumulative points
    const sorted = [...evaluations].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let cumulative = 0;
    return sorted.map((e, i) => {
      cumulative += e.pointsAwarded;
      return {
        index: i + 1,
        value: cumulative,
        success: e.success,
      };
    });
  }, [evaluations]);

  // Create segments for colored lines based on direction
  const segments = useMemo(() => {
    if (chartData.length < 2) {
      return [];
    }

    const result: { data: ChartDataPoint[]; color: string }[] = [];

    for (let i = 0; i < chartData.length - 1; i++) {
      const current = chartData[i];
      const next = chartData[i + 1];
      const isRising = next.value >= current.value;

      result.push({
        data: chartData.map((point, idx) => ({
          ...point,
          // Only include values for this segment, null for others
          [`segment${i}`]: idx === i || idx === i + 1 ? point.value : null,
        })),
        color: isRising ? "#10b981" : "#ef4444",
      });
    }

    return result;
  }, [chartData]);

  // Merge all segment data into single dataset
  const mergedData = useMemo(() => {
    if (chartData.length < 2) {
      return chartData;
    }

    return chartData.map((point, idx) => {
      const segmentValues: Record<string, number | null> = {};
      for (let i = 0; i < chartData.length - 1; i++) {
        segmentValues[`segment${i}`] =
          idx === i || idx === i + 1 ? point.value : null;
      }
      return {
        ...point,
        ...segmentValues,
      };
    });
  }, [chartData]);

  if (evaluations.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        need more evaluations to show chart
      </div>
    );
  }

  const minValue = Math.min(0, ...chartData.map((d) => d.value));
  const maxValue = Math.max(0, ...chartData.map((d) => d.value));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart
        data={mergedData}
        margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
      >
        <XAxis
          dataKey="index"
          axisLine={{ stroke: "#525252" }}
          tickLine={{ stroke: "#525252" }}
          tick={{ fontSize: 10, fill: "#a3a3a3" }}
          label={{
            value: "evaluation",
            position: "bottom",
            offset: 5,
            style: { fontSize: 10, fill: "#737373" },
          }}
        />
        <YAxis
          domain={[minValue, maxValue]}
          axisLine={{ stroke: "#525252" }}
          tickLine={{ stroke: "#525252" }}
          tick={{ fontSize: 10, fill: "#a3a3a3" }}
          tickFormatter={(value) => (value > 0 ? `+${value}` : `${value}`)}
          width={35}
          allowDecimals={false}
          label={{
            value: "points",
            angle: -90,
            position: "insideLeft",
            offset: 10,
            style: { fontSize: 10, fill: "#737373", textAnchor: "middle" },
          }}
        />
        <ReferenceLine y={0} stroke="#525252" strokeDasharray="3 3" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 0,
            fontSize: 11,
          }}
          labelFormatter={(label) => `Evaluation ${label}`}
          formatter={(value) => [
            typeof value === "number" && value > 0 ? `+${value}` : value,
            "Points",
          ]}
        />
        {/* Render colored segments */}
        {segments.map((segment, i) => (
          <Line
            key={`segment-${i}`}
            type="linear"
            dataKey={`segment${i}`}
            stroke={segment.color}
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            connectNulls
          />
        ))}
        {/* Render dots on top */}
        <Line
          type="linear"
          dataKey="value"
          stroke="transparent"
          strokeWidth={0}
          dot={renderDot}
          activeDot={{ r: 6, fill: "#3b82f6" }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

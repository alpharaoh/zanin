import { useMemo } from "react";
import type { EvaluationHistoryItem } from "@/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";

interface DailySuccessChartProps {
  evaluations: EvaluationHistoryItem[];
  days?: number;
}

interface DailyData {
  date: string;
  displayDate: string;
  rate: number;
  successes: number;
  total: number;
}

export function DailySuccessChart({
  evaluations,
  days = 14,
}: DailySuccessChartProps) {
  const chartData = useMemo(() => {
    // Generate all days in range
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Group evaluations by date
    const dailyMap = new Map<string, { successes: number; total: number }>();

    for (const day of allDays) {
      const dateKey = format(day, "yyyy-MM-dd");
      dailyMap.set(dateKey, { successes: 0, total: 0 });
    }

    for (const evaluation of evaluations) {
      const dateKey = format(new Date(evaluation.createdAt), "yyyy-MM-dd");
      const existing = dailyMap.get(dateKey);
      if (existing) {
        existing.total++;
        if (evaluation.success) {
          existing.successes++;
        }
      }
    }

    // Convert to chart format
    const data: DailyData[] = [];
    for (const [dateKey, stats] of dailyMap) {
      const rate = stats.total > 0 ? Math.round((stats.successes / stats.total) * 100) : 0;
      data.push({
        date: dateKey,
        displayDate: format(new Date(dateKey), "MMM d"),
        rate: stats.total > 0 ? rate : 0,
        successes: stats.successes,
        total: stats.total,
      });
    }

    // Sort by date
    data.sort((a, b) => a.date.localeCompare(b.date));

    return data;
  }, [evaluations, days]);

  const hasData = chartData.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
        // no evaluations yet
      </div>
    );
  }

  const getBarColor = (rate: number, total: number) => {
    if (total === 0) {
      return "#404040";
    }
    if (rate >= 80) {
      return "#10b981";
    }
    if (rate >= 50) {
      return "#f59e0b";
    }
    return "#ef4444";
  };

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
      >
        <XAxis
          dataKey="displayDate"
          axisLine={{ stroke: "#525252" }}
          tickLine={{ stroke: "#525252" }}
          tick={{ fontSize: 9, fill: "#a3a3a3" }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          axisLine={{ stroke: "#525252" }}
          tickLine={{ stroke: "#525252" }}
          tick={{ fontSize: 9, fill: "#a3a3a3" }}
          tickFormatter={(value) => `${value}%`}
          width={35}
        />
        <ReferenceLine y={50} stroke="#525252" strokeDasharray="3 3" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 0,
            fontSize: 11,
          }}
          formatter={(value, _name, props) => {
            const { payload } = props;
            if (payload.total === 0) {
              return ["No evaluations", ""];
            }
            return [`${payload.successes}/${payload.total} (${value}%)`, "Success rate"];
          }}
          labelFormatter={(label) => label}
        />
        <Bar dataKey="rate" radius={[2, 2, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBarColor(entry.rate, entry.total)}
              opacity={entry.total === 0 ? 0.3 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

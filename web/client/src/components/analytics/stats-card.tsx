import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  className?: string;
}

export function StatsCard({ label, value, subtext, className }: StatsCardProps) {
  return (
    <div className={cn("bg-card px-4 py-4", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-medium tabular-nums tracking-tight">
        {value}
      </p>
      {subtext && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{subtext}</p>
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";

interface SpeakingTimeChartProps {
  ownerSeconds: number;
  otherSeconds: number;
  className?: string;
}

export function SpeakingTimeChart({
  ownerSeconds,
  otherSeconds,
  className,
}: SpeakingTimeChartProps) {
  const total = ownerSeconds + otherSeconds;
  const ownerPercent = total > 0 ? Math.round((ownerSeconds / total) * 100) : 0;
  const otherPercent = total > 0 ? Math.round((otherSeconds / total) * 100) : 0;

  return (
    <div className={cn("space-y-4", className)}>
      <p className="section-label">Speaking time</p>

      {/* Bar visualization */}
      <div className="space-y-3">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${ownerPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-xs">
          <div>
            <span className="font-medium">{ownerPercent}%</span>
            <span className="ml-1.5 text-muted-foreground">You</span>
            <span className="ml-2 mono text-muted-foreground/70">
              {formatDuration(ownerSeconds)}
            </span>
          </div>
          <div className="text-right">
            <span className="font-medium">{otherPercent}%</span>
            <span className="ml-1.5 text-muted-foreground">Others</span>
            <span className="ml-2 mono text-muted-foreground/70">
              {formatDuration(otherSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-2">
        <div>
          <p className="text-[11px] text-muted-foreground">Total</p>
          <p className="mono text-sm font-medium">{formatDuration(total)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Your ratio</p>
          <p className="mono text-sm font-medium">{ownerPercent}%</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Talk/listen</p>
          <p className="mono text-sm font-medium">
            {otherSeconds > 0 ? (ownerSeconds / otherSeconds).toFixed(2) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

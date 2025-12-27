import { cn } from "@/lib/utils";
import { FlameIcon } from "lucide-react";

interface StreakIndicatorProps {
  streak: number;
  longestStreak?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StreakIndicator({
  streak,
  longestStreak,
  size = "md",
  className,
}: StreakIndicatorProps) {
  const isOnFire = streak >= 3;
  const isLegendary = streak >= 7;
  const isBestStreak = longestStreak !== undefined && streak >= longestStreak && streak > 0;

  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-1.5",
    lg: "text-base gap-2",
  };

  const iconSizes = {
    sm: "size-3",
    md: "size-4",
    lg: "size-5",
  };

  return (
    <div
      className={cn(
        "flex items-center font-mono",
        sizeClasses[size],
        isLegendary && "text-orange-400",
        isOnFire && !isLegendary && "text-amber-500",
        !isOnFire && "text-muted-foreground",
        className
      )}
    >
      <FlameIcon
        className={cn(
          iconSizes[size],
          isLegendary && "animate-pulse text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]",
          isOnFire && !isLegendary && "text-amber-500",
          !isOnFire && "text-muted-foreground/50"
        )}
      />
      <span className={cn("tabular-nums", isBestStreak && "text-primary")}>
        {streak}
      </span>
      {isBestStreak && streak > 0 && (
        <span className="text-[10px] text-primary">BEST</span>
      )}
    </div>
  );
}

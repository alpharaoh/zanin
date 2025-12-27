import { cn } from "@/lib/utils";
import type { Signal } from "@/api";
import { StreakIndicator } from "./StreakIndicator";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

interface SignalCardProps {
  signal: Signal;
  onEdit?: (signal: Signal) => void;
  onDelete?: (signal: Signal) => void;
  onToggleActive?: (signal: Signal) => void;
  className?: string;
}

export function SignalCard({
  signal,
  onEdit,
  onDelete,
  onToggleActive,
  className,
}: SignalCardProps) {
  const successRate =
    signal.totalSuccesses + signal.totalFailures > 0
      ? Math.round(
          (signal.totalSuccesses / (signal.totalSuccesses + signal.totalFailures)) * 100
        )
      : 0;

  const hasEvaluations = signal.totalSuccesses + signal.totalFailures > 0;

  return (
    <div
      className={cn(
        "border border-border bg-card transition-colors",
        !signal.isActive && "opacity-60",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border p-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">{signal.name}</h3>
            {!signal.isActive && (
              <span className="text-[10px] text-muted-foreground">[PAUSED]</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {signal.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={signal.isActive}
            onCheckedChange={() => onToggleActive?.(signal)}
            aria-label="Toggle signal active"
          />
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 text-muted-foreground hover:text-foreground">
              <MoreVerticalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border bg-card">
              <DropdownMenuItem
                onClick={() => onEdit?.(signal)}
                className="text-xs"
              >
                <PencilIcon className="mr-2 size-3" />
                edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleActive?.(signal)}
                className="text-xs"
              >
                {signal.isActive ? (
                  <>
                    <PauseIcon className="mr-2 size-3" />
                    pause
                  </>
                ) : (
                  <>
                    <PlayIcon className="mr-2 size-3" />
                    resume
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(signal)}
                className="text-xs text-destructive focus:text-destructive"
              >
                <TrashIcon className="mr-2 size-3" />
                delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 divide-x divide-border">
        {/* Points */}
        <div className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            points
          </p>
          <p
            className={cn(
              "mt-1 text-lg font-medium tabular-nums",
              signal.totalPoints > 0 && "text-emerald-500",
              signal.totalPoints < 0 && "text-red-500",
              signal.totalPoints === 0 && "text-muted-foreground"
            )}
          >
            {signal.totalPoints > 0 ? "+" : ""}
            {signal.totalPoints}
          </p>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center justify-center p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            streak
          </p>
          <div className="mt-1">
            <StreakIndicator
              streak={signal.currentStreak}
              longestStreak={signal.longestStreak}
              size="md"
            />
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            success
          </p>
          <div className="mt-1 flex items-center justify-center gap-1">
            {hasEvaluations ? (
              <>
                {successRate >= 50 ? (
                  <TrendingUpIcon className="size-3.5 text-emerald-500" />
                ) : (
                  <TrendingDownIcon className="size-3.5 text-red-500" />
                )}
                <span
                  className={cn(
                    "text-lg font-medium tabular-nums",
                    successRate >= 50 ? "text-emerald-500" : "text-red-500"
                  )}
                >
                  {successRate}%
                </span>
              </>
            ) : (
              <span className="text-lg text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Goal snippet */}
      <div className="border-t border-border bg-muted/30 px-4 py-2">
        <p className="text-[10px] text-muted-foreground">
          <span className="text-muted-foreground/70">goal:</span>{" "}
          <span className="line-clamp-1">{signal.goal}</span>
        </p>
      </div>
    </div>
  );
}

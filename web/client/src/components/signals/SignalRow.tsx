import { cn } from "@/lib/utils";
import type { Signal } from "@/api";
import { Link } from "@tanstack/react-router";
import { TrashIcon, FlameIcon } from "lucide-react";
import { useState } from "react";
import { formatDistance } from "date-fns";

interface SignalRowProps {
  signal: Signal;
  onDelete?: (signal: Signal) => void;
}

export function SignalRow({ signal, onDelete }: SignalRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  const totalEvaluations = signal.totalSuccesses + signal.totalFailures;
  const successRate =
    totalEvaluations > 0
      ? Math.round((signal.totalSuccesses / totalEvaluations) * 100)
      : null;

  return (
    <Link
      to="/dashboard/signals/$signalId"
      params={{ signalId: signal.id }}
      className={cn(
        "group grid grid-cols-11 gap-4 border-b border-border px-4 py-3 text-sm transition-colors last:border-b-0 no-underline",
        signal.isActive
          ? "hover:bg-neutral-800/50 cursor-pointer"
          : "hover:bg-neutral-800/50 cursor-pointer opacity-50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Name */}
      <div
        className={cn(
          "col-span-5 flex items-center gap-2 truncate transition-colors",
          isHovered ? "text-neutral-300" : "text-muted-foreground"
        )}
      >
        {signal.name}
        {!signal.isActive && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
            paused
          </span>
        )}
      </div>

      {/* Points */}
      <div
        className={cn(
          "col-span-1 text-right tabular-nums",
          signal.totalPoints > 0 && "text-emerald-500",
          signal.totalPoints < 0 && "text-red-500",
          signal.totalPoints === 0 && "text-muted-foreground"
        )}
      >
        {signal.totalPoints > 0 ? "+" : ""}
        {signal.totalPoints}
      </div>

      {/* Streak */}
      <div
        className={cn(
          "col-span-1 flex items-center justify-end gap-1 tabular-nums",
          signal.currentStreak >= 7 && "text-amber-500",
          signal.currentStreak >= 3 &&
            signal.currentStreak < 7 &&
            "text-amber-400/70",
          signal.currentStreak < 3 && "text-muted-foreground"
        )}
      >
        {signal.currentStreak > 0 && <FlameIcon className="size-3.5" />}
        {signal.currentStreak > 0 ? signal.currentStreak : "—"}
      </div>

      {/* Success Rate */}
      <div className="col-span-1 text-right tabular-nums text-muted-foreground">
        {successRate !== null ? `${successRate}%` : "—"}
      </div>

      {/* Date */}
      <div className="col-span-2 text-right text-muted-foreground whitespace-nowrap truncate">
        {formatDistance(new Date(signal.createdAt), new Date(), {
          addSuffix: true,
        })}
      </div>

      {/* Delete */}
      <div className="flex">
        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(signal);
            }}
            className={cn(
              "p-1 text-muted-foreground transition-all hover:text-destructive",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            <TrashIcon className="size-3.5" />
          </button>
        )}
      </div>
    </Link>
  );
}

export function SignalListHeader() {
  return (
    <div className="grid grid-cols-11 gap-4 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
      <div className="col-span-5">name</div>
      <div className="col-span-1 text-right">points</div>
      <div className="col-span-1 text-right">streak</div>
      <div className="col-span-1 text-right">rate</div>
      <div className="col-span-2 text-right">created</div>
      <div className="col-span-1"></div>
    </div>
  );
}

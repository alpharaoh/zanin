import { cn } from "@/lib/utils";
import type { Achievement, AchievementDefinition } from "@/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";

interface AchievementBadgeProps {
  achievement: Achievement;
  definition?: AchievementDefinition;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_signal: "🎯",
  first_success: "🌟",
  streak_3: "🔥",
  streak_7: "💪",
  streak_14: "⚡",
  streak_30: "👑",
  points_10: "🔟",
  points_50: "💎",
  points_100: "🏆",
  comeback: "🦅",
};

export function AchievementBadge({
  achievement,
  definition,
  size = "md",
  className,
}: AchievementBadgeProps) {
  const icon =
    definition?.icon ||
    ACHIEVEMENT_ICONS[achievement.achievementType] ||
    "🏅";

  const name = definition?.name || achievement.achievementType;
  const description = definition?.description || "";

  const sizeClasses = {
    sm: "size-8 text-sm",
    md: "size-10 text-base",
    lg: "size-14 text-xl",
  };

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "flex items-center justify-center rounded-full border border-border bg-card transition-transform hover:scale-110",
          sizeClasses[size],
          className
        )}
      >
        <span role="img" aria-label={name}>
          {icon}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs border-border bg-card text-xs">
        <div className="space-y-1">
          <p className="font-medium">{name}</p>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
          <p className="text-[10px] text-muted-foreground/70">
            unlocked {format(new Date(achievement.unlockedAt), "MMM d, yyyy")}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface AchievementGridProps {
  achievements: Achievement[];
  definitions: Record<string, AchievementDefinition>;
  className?: string;
}

export function AchievementGrid({
  achievements,
  definitions,
  className,
}: AchievementGridProps) {
  if (achievements.length === 0) {
    return (
      <div className="text-center text-xs text-muted-foreground">
        // no achievements yet
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {achievements.map((achievement) => (
        <AchievementBadge
          key={achievement.id}
          achievement={achievement}
          definition={definitions[achievement.achievementType]}
          size="md"
        />
      ))}
    </div>
  );
}

import type { Achievement, AchievementDefinition } from "@/api";
import { formatDistance } from "date-fns";

interface RecentAchievementsProps {
  achievements: Achievement[];
  definitions: Record<string, AchievementDefinition>;
  limit?: number;
}

export function RecentAchievements({
  achievements,
  definitions,
  limit = 4,
}: RecentAchievementsProps) {
  // Sort by unlockedAt descending and take the most recent
  const recent = [...achievements]
    .sort(
      (a, b) =>
        new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
    )
    .slice(0, limit);

  if (recent.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        // no achievements yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recent.map((achievement) => {
        const def = definitions[achievement.achievementType];
        return (
          <div
            key={achievement.id}
            className="flex items-center gap-2.5 p-2 border border-border bg-card/50"
          >
            <span className="text-base shrink-0">{def?.icon || "🏅"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {def?.name || achievement.achievementType}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {achievement.metadata?.signalName && (
                  <span>"{achievement.metadata.signalName}" · </span>
                )}
                {formatDistance(new Date(achievement.unlockedAt), new Date(), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

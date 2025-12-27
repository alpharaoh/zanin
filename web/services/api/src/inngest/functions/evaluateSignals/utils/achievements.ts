import { insertAchievement } from "@zanin/db/queries/insert/insertAchievement";
import { listAchievements } from "@zanin/db/queries/select/many/listAchievements";
import { SelectAchievement } from "@zanin/db/schema";

export interface EvaluationResult {
  signalId: string;
  signalName: string;
  success: boolean;
  newStreak: number;
  newTotalPoints: number;
  previousTotalPoints: number;
}

export async function checkAndAwardAchievements(
  userId: string,
  organizationId: string,
  evaluationResults: EvaluationResult[],
): Promise<SelectAchievement[]> {
  const newAchievements: SelectAchievement[] = [];

  // Get existing achievements
  const { data: existingAchievements } = await listAchievements({
    userId,
    organizationId,
  });
  const existingTypes = new Set(
    existingAchievements.map(
      (a) => `${a.achievementType}_${a.signalId || "global"}`,
    ),
  );

  for (const result of evaluationResults) {
    // Check first_success achievement (first successful evaluation for this signal)
    if (result.success === true) {
      const firstSuccessKey = `first_success_${result.signalId}`;
      if (result.newStreak === 1 && !existingTypes.has(firstSuccessKey)) {
        const achievement = await insertAchievement({
          userId,
          organizationId,
          achievementType: "first_success",
          signalId: result.signalId,
          metadata: {
            signalName: result.signalName,
          },
        });
        newAchievements.push(achievement);
        existingTypes.add(firstSuccessKey);
      }

      // Check streak achievements
      const streakAchievements = [
        { streak: 3, type: "streak_3" },
        { streak: 7, type: "streak_7" },
        { streak: 14, type: "streak_14" },
        { streak: 30, type: "streak_30" },
      ];

      for (const { streak, type } of streakAchievements) {
        const achievementKey = `${type}_${result.signalId}`;
        if (result.newStreak >= streak && !existingTypes.has(achievementKey)) {
          const achievement = await insertAchievement({
            userId,
            organizationId,
            achievementType: type,
            signalId: result.signalId,
            metadata: {
              signalName: result.signalName,
              streakCount: result.newStreak,
            },
          });
          newAchievements.push(achievement);
          existingTypes.add(achievementKey);
        }
      }
    }

    // Check points achievements
    const pointsAchievements = [
      { points: 10, type: "points_10" },
      { points: 50, type: "points_50" },
      { points: 100, type: "points_100" },
    ];

    for (const { points, type } of pointsAchievements) {
      const achievementKey = `${type}_${result.signalId}`;
      if (
        result.newTotalPoints >= points &&
        !existingTypes.has(achievementKey)
      ) {
        const achievement = await insertAchievement({
          userId,
          organizationId,
          achievementType: type,
          signalId: result.signalId,
          metadata: {
            signalName: result.signalName,
            pointsTotal: result.newTotalPoints,
          },
        });
        newAchievements.push(achievement);
        existingTypes.add(achievementKey);
      }
    }

    // Check comeback achievement (went from negative to zero or positive)
    const comebackKey = `comeback_${result.signalId}`;
    if (
      result.previousTotalPoints < 0 &&
      result.newTotalPoints >= 0 &&
      !existingTypes.has(comebackKey)
    ) {
      const achievement = await insertAchievement({
        userId,
        organizationId,
        achievementType: "comeback",
        signalId: result.signalId,
        metadata: {
          signalName: result.signalName,
          pointsTotal: result.newTotalPoints,
        },
      });
      newAchievements.push(achievement);
      existingTypes.add(comebackKey);
    }
  }

  return newAchievements;
}

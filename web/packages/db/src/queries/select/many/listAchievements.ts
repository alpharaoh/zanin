import { isNull, SQL } from "drizzle-orm";
import { InsertAchievement, achievements } from "../../../schema";
import { buildListQuery } from "../../../utils/buildListQuery";

export interface ListAchievementsFilters {
  ids?: string[];
}

export const listAchievements = async (
  where?: Partial<InsertAchievement> & ListAchievementsFilters,
  orderBy?: Partial<Record<keyof InsertAchievement, "asc" | "desc">>,
  limit?: number,
  offset?: number,
) => {
  const extraConditions: SQL[] = [isNull(achievements.deletedAt)];

  return buildListQuery(achievements, {
    where,
    orderBy,
    limit,
    offset,
    extraConditions,
  });
};

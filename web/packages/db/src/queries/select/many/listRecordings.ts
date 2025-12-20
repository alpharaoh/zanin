import { and, inArray } from "drizzle-orm";
import { InsertRecording, recordings } from "../../../schema";
import { buildWhere } from "../../../utils/buildWhere";
import db from "../../..";

export const listOrganizations = async (
  where?: Partial<InsertRecording> & { ids?: string[] },
) => {
  const { ids, ...rest } = where || {};
  let whereCondition = buildWhere(recordings, rest);

  if (ids) {
    whereCondition = and(whereCondition, inArray(recordings.id, ids));
  }

  return await db.select().from(recordings).where(whereCondition);
};

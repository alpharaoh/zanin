import { and, inArray } from "drizzle-orm";
import { InsertRecording, recordings } from "../../../schema";
import { buildOrderBy } from "../../../utils/buildOrderBy";
import { buildWhere } from "../../../utils/buildWhere";
import db from "../../..";

export const listRecordings = async (
  where?: Partial<InsertRecording> & { ids?: string[] },
  orderBy?: Partial<Record<keyof InsertRecording, "asc" | "desc">>,
  limit?: number,
  offset?: number,
) => {
  const { ids, ...rest } = where || {};
  let whereCondition = buildWhere(recordings, rest);

  if (ids) {
    whereCondition = and(whereCondition, inArray(recordings.id, ids));
  }

  const query = db.select().from(recordings).where(whereCondition);

  if (orderBy) {
    query.orderBy(...buildOrderBy(recordings, orderBy));
  }

  if (limit) {
    query.limit(limit);
  }

  if (offset) {
    query.offset(offset);
  }

  return query;
};

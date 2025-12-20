import { and, count, inArray } from "drizzle-orm";
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

  const dataQuery = db.select().from(recordings).where(whereCondition);

  if (orderBy) {
    dataQuery.orderBy(...buildOrderBy(recordings, orderBy));
  }

  if (limit) {
    dataQuery.limit(limit);
  }

  if (offset) {
    dataQuery.offset(offset);
  }

  const countQuery = db
    .select({ count: count() })
    .from(recordings)
    .where(whereCondition);

  const [data, countResult] = await Promise.all([dataQuery, countQuery]);

  return {
    data,
    count: countResult[0]?.count ?? 0,
  };
};

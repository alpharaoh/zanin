import { and, count, gte, ilike, inArray, lte } from "drizzle-orm";
import { InsertRecording, recordings } from "../../../schema";
import { buildOrderBy } from "../../../utils/buildOrderBy";
import { buildWhere } from "../../../utils/buildWhere";
import db from "../../..";

export interface ListRecordingsFilters {
  ids?: string[];
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export const listRecordings = async (
  where?: Partial<InsertRecording> & ListRecordingsFilters,
  orderBy?: Partial<Record<keyof InsertRecording, "asc" | "desc">>,
  limit?: number,
  offset?: number,
) => {
  const { ids, search, startDate, endDate, ...rest } = where || {};
  let whereCondition = buildWhere(recordings, rest);

  if (ids) {
    whereCondition = and(whereCondition, inArray(recordings.id, ids));
  }

  if (search) {
    whereCondition = and(whereCondition, ilike(recordings.title, `%${search}%`));
  }

  if (startDate) {
    whereCondition = and(whereCondition, gte(recordings.finishedAt, startDate));
  }

  if (endDate) {
    whereCondition = and(whereCondition, lte(recordings.finishedAt, endDate));
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

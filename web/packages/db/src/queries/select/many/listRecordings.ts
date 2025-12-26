import { gte, ilike, lte, SQL } from "drizzle-orm";
import { InsertRecording, recordings } from "../../../schema";
import { buildListQuery } from "../../../utils/buildListQuery";

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
  const { search, startDate, endDate, ...rest } = where || {};

  const extraConditions: SQL[] = [];

  if (search) {
    extraConditions.push(ilike(recordings.title, `%${search}%`));
  }

  if (startDate) {
    extraConditions.push(gte(recordings.createdAt, startDate));
  }

  if (endDate) {
    extraConditions.push(lte(recordings.createdAt, endDate));
  }

  return buildListQuery(recordings, {
    where: rest,
    orderBy,
    limit,
    offset,
    extraConditions,
  });
};

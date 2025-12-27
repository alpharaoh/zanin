import { isNull, SQL } from "drizzle-orm";
import { InsertSignal, signals } from "../../../schema";
import { buildListQuery } from "../../../utils/buildListQuery";

export interface ListSignalsFilters {
  ids?: string[];
  isActive?: boolean;
}

export const listSignals = async (
  where?: Partial<InsertSignal> & ListSignalsFilters,
  orderBy?: Partial<Record<keyof InsertSignal, "asc" | "desc">>,
  limit?: number,
  offset?: number,
) => {
  const extraConditions: SQL[] = [isNull(signals.deletedAt)];

  return buildListQuery(signals, {
    where,
    orderBy,
    limit,
    offset,
    extraConditions,
  });
};

import { eq, isNull, SQL } from "drizzle-orm";
import { InsertSignalEvaluation, signalEvaluations } from "../../../schema";
import { buildListQuery } from "../../../utils/buildListQuery";

export interface ListSignalEvaluationsFilters {
  ids?: string[];
  signalId?: string;
  recordingId?: string;
}

export const listSignalEvaluations = async (
  where?: Partial<InsertSignalEvaluation> & ListSignalEvaluationsFilters,
  orderBy?: Partial<Record<keyof InsertSignalEvaluation, "asc" | "desc">>,
  limit?: number,
  offset?: number,
) => {
  const { signalId, recordingId, ...rest } = where || {};
  const extraConditions: SQL[] = [isNull(signalEvaluations.deletedAt)];

  if (signalId) {
    extraConditions.push(eq(signalEvaluations.signalId, signalId));
  }

  if (recordingId) {
    extraConditions.push(eq(signalEvaluations.recordingId, recordingId));
  }

  return buildListQuery(signalEvaluations, {
    where: rest,
    orderBy,
    limit,
    offset,
    extraConditions,
  });
};

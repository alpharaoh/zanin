import { member, InsertMember } from "../../../schema";
import { buildListQuery } from "../../../utils/buildListQuery";

export const listMembers = async (
  where?: Partial<InsertMember> & { ids?: string[] },
  orderBy?: Partial<Record<keyof InsertMember, "asc" | "desc">>,
  limit?: number,
  offset?: number,
) => {
  return buildListQuery(member, {
    where,
    orderBy,
    limit,
    offset,
  });
};

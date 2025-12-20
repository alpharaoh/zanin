import { and, inArray } from "drizzle-orm";
import { InsertMember, member } from "../../../schema";
import { buildWhere } from "../../../utils/buildWhere";
import db from "../../..";

export const listMembers = async (
  where?: Partial<InsertMember> & { ids?: string[] },
) => {
  const { ids, ...rest } = where || {};
  let whereCondition = buildWhere(member, rest);

  if (ids) {
    whereCondition = and(whereCondition, inArray(member.id, ids));
  }

  return await db.select().from(member).where(whereCondition);
};

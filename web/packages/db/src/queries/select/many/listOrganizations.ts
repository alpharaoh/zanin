import { organization, InsertOrganization } from "../../../schema";
import { buildListQuery } from "../../../utils/buildListQuery";

export const listOrganizations = async (
  where?: Partial<InsertOrganization> & { ids?: string[] },
  orderBy?: Partial<Record<keyof InsertOrganization, "asc" | "desc">>,
  limit?: number,
  offset?: number,
) => {
  return buildListQuery(organization, {
    where,
    orderBy,
    limit,
    offset,
  });
};

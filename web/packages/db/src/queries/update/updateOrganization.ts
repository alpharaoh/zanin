import db from "../../";
import { InsertOrganization, organization } from "../../schema";
import { buildWhere } from "../../utils/buildWhere";

export const updateOrganization = async (
  where: Partial<InsertOrganization>,
  values: Partial<InsertOrganization>,
) => {
  const conditionals = buildWhere(organization, where);

  return await db
    .update(organization)
    .set(values)
    .where(conditionals)
    .returning();
};

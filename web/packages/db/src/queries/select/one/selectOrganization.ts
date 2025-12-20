import db from "../../..";
import { eq } from "drizzle-orm";
import { organization } from "../../../schema";

export const selectOrganization = async (id: string) => {
  const entry = await db
    .select()
    .from(organization)
    .where(eq(organization.id, id))
    .limit(1);

  return entry[0];
};

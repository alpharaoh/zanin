import db from "../";
import { usersTable } from "../schema";

export const getUser = () => {
  return db.select().from(usersTable);
};

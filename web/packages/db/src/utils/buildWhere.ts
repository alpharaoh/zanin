import { and, eq } from "drizzle-orm";

export function buildWhere<
  InsertRow extends Record<string, any>,
  TableColumns extends Record<keyof InsertRow, any>,
>(table: TableColumns, where: Partial<InsertRow>) {
  const predicates = (Object.keys(where) as (keyof InsertRow)[])
    .filter((k) => where[k] !== undefined)
    .map((k) => eq(table[k], where[k]));

  if (!predicates.length) {
    return and();
  }
  return and(...predicates);
}

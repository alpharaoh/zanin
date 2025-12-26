import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { getDefaultColumns } from "../utils/getDefaultColumns";

export const user = pgTable("user", {
  ...getDefaultColumns(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: text("active_organization_id"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const organization = pgTable("organization", {
  ...getDefaultColumns(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  metadata: jsonb("metadata"),
});

export const member = pgTable("member", {
  ...getDefaultColumns(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

// Note: better-auth looks for "apikey" (lowercase) in the schema
export const apikey = pgTable("api_key", {
  id: text("id").primaryKey(),
  name: text("name"),
  // First few characters for display (e.g., "zn_abc12...")
  start: text("start"),
  // Prefix for the key (e.g., "zn_")
  prefix: text("prefix"),
  // Hashed API key
  key: text("key").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // Remaining requests (null = unlimited)
  remaining: integer("remaining"),
  // Refill configuration
  refillInterval: integer("refill_interval"),
  refillAmount: integer("refill_amount"),
  lastRefillAt: timestamp("last_refill_at"),
  // Enable/disable
  enabled: boolean("enabled").default(true).notNull(),
  // Rate limiting
  rateLimitEnabled: boolean("rate_limit_enabled").default(false),
  rateLimitTimeWindow: integer("rate_limit_time_window"),
  rateLimitMax: integer("rate_limit_max"),
  requestCount: integer("request_count").default(0),
  lastRequest: timestamp("last_request"),
  // Expiration
  expiresAt: timestamp("expires_at"),
  // Timestamps
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  // Permissions and metadata
  permissions: text("permissions"),
  metadata: text("metadata"),
});

export type SelectUser = typeof user.$inferSelect;
export type InsertUser = typeof user.$inferInsert;

export type SelectSession = typeof session.$inferSelect;
export type InsertSession = typeof session.$inferInsert;

export type SelectAccount = typeof account.$inferSelect;
export type InsertAccount = typeof account.$inferInsert;

export type SelectVerification = typeof verification.$inferSelect;
export type InsertVerification = typeof verification.$inferInsert;

export type SelectOrganization = typeof organization.$inferSelect;
export type InsertOrganization = typeof organization.$inferInsert;

export type SelectMember = typeof member.$inferSelect;
export type InsertMember = typeof member.$inferInsert;

export type SelectInvitation = typeof invitation.$inferSelect;
export type InsertInvitation = typeof invitation.$inferInsert;

export type SelectApiKey = typeof apikey.$inferSelect;
export type InsertApiKey = typeof apikey.$inferInsert;

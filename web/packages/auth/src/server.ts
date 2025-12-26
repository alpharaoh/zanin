import { betterAuth } from "better-auth";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { organization, apiKey } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "@zanin/db";
import { env } from "@zanin/env/server";
import { eq } from "drizzle-orm";
import { getActiveOrganization } from "@zanin/db/utils/getActiveOrganization";
import * as schema from "@zanin/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: [env.CLIENT_URL],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [
    organization(),
    apiKey({
      defaultPrefix: "zn_",
      enableSessionForAPIKeys: true,
      customAPIKeyGetter: (ctx) => {
        const authHeader = ctx.request?.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          return authHeader.slice(7);
        }
        return null;
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create a new organization and a member for the user
          const name =
            user.name?.trim() !== ""
              ? `${user.name.split(" ")[0]}'s Workspace`
              : "Personal Workspace";

          const baseSlug = slugify(name.replace("'", ""));
          let slug = baseSlug;
          let i = 1;

          // If the slug already exists, append "-2", "-3", …
          await db.transaction(async (tx) => {
            while (
              await tx
                .select({ id: schema.organization.id })
                .from(schema.organization)
                .where(eq(schema.organization.slug, slug))
                .then((rows) => rows.length > 0)
            ) {
              slug = `${baseSlug}-${++i}`;
            }

            const org = await tx
              .insert(schema.organization)
              .values({ name, slug })
              .returning()
              .then((rows) => rows[0]);

            await tx.insert(schema.member).values({
              organizationId: org.id,
              userId: user.id,
              role: "owner",
            });
          });
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const organization = await getActiveOrganization(session.userId);
          return {
            data: {
              ...session,
              activeOrganizationId: organization.id,
            },
          };
        },
      },
    },
  },
});

export const authMiddleware = toNodeHandler(auth);
export { fromNodeHeaders };

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

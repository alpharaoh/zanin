import { authClient } from "@zanin/auth/client";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession();

    if (!session?.user) {
      throw redirect({
        to: "/sign-in",
        search: {
          redirect: location.href,
        },
      });
    } else {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
});

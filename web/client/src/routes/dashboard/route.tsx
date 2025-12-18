import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();

    if (!session) {
      throw redirect({
        to: "/sign-in",
      });
    }

    return {
      session,
    };
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const { data: session, refetch } = authClient.useSession();

  return (
    <div className="min-h-screen">
      <header className="border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <div className="flex items-center gap-4">
            {session?.user && (
              <span className="text-sm text-muted-foreground">
                {session.user.email}
              </span>
            )}
            <button
              onClick={() => refetch()}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Refresh Session
            </button>
            <button
              onClick={() => authClient.signOut()}
              className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}

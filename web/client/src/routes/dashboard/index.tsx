import { createFileRoute } from "@tanstack/react-router";

const DashboardIndex = () => {
  const { session } = Route.useRouteContext();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Welcome to your Dashboard</h2>
      <p className="text-muted-foreground">
        You are signed in as {session?.user?.email}
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold">Overview</h3>
          <p className="text-sm text-muted-foreground mt-2">
            View your account summary
          </p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold">Settings</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Manage your preferences
          </p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold">Activity</h3>
          <p className="text-sm text-muted-foreground mt-2">
            See your recent activity
          </p>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

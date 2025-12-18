import { useGetMe } from "@/api";
import { createFileRoute } from "@tanstack/react-router";

const DashboardIndex = () => {
  const { session } = Route.useRouteContext();
  const { data } = useGetMe();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Welcome to your Dashboard</h2>
      <p className="text-muted-foreground">
        You are signed in as {session?.user?.email}
      </p>
      {JSON.stringify(data)}
    </div>
  );
};

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

import { DashboardSidebar } from "@/components/sidebar";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { authClient } from "@zanin/auth/client";
import { LayoutDashboardIcon, SettingsIcon, UsersIcon } from "lucide-react";

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
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();

  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Users",
      url: "/dashboard/users",
      icon: <UsersIcon />,
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: <SettingsIcon />,
    },
  ];

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/sign-in" });
  };

  return (
    <DashboardSidebar
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      organization={{
        name: "My Organization",
        plan: "Enterprise",
      }}
      navItems={navItems}
      onSignOut={handleSignOut}
    >
      <div className="flex flex-1 flex-col gap-4 p-4 max-w-7xl w-full mx-auto">
        <Outlet />
      </div>
    </DashboardSidebar>
  );
}

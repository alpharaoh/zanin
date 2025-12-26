import { DashboardSidebar } from "@/components/sidebar";
import { ChatPanel } from "@/components/chat";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
  useMatches,
} from "@tanstack/react-router";
import { authClient } from "@zanin/auth/client";
import { LayoutDashboardIcon, MessageSquareIcon, MicIcon, SettingsIcon } from "lucide-react";
import { useMemo } from "react";

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
  const matches = useMatches();

  // Extract recordingId from route params if on a recording detail page
  const recordingId = useMemo(() => {
    const recordingMatch = matches.find(
      (match) => match.routeId === "/dashboard/recordings/$recordingId"
    );
    return recordingMatch?.params?.recordingId as string | undefined;
  }, [matches]);

  // Hide chat panel on the chat page (it has its own chat interface)
  const isOnChatPage = matches.some((match) =>
    match.routeId.startsWith("/dashboard/chat")
  );

  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Recordings",
      url: "/dashboard/recordings",
      icon: <MicIcon />,
    },
    {
      title: "Chat",
      url: "/dashboard/chat",
      icon: <MessageSquareIcon />,
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
      navItems={navItems}
      onSignOut={handleSignOut}
    >
      {isOnChatPage ? (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-y-auto p-6">
          <Outlet />
        </div>
      ) : (
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Main content area */}
          <ResizablePanel defaultSize={75}>
            <div className="flex h-full flex-1 flex-col gap-4 overflow-y-auto p-6">
              <Outlet />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Chat panel */}
          <ResizablePanel defaultSize={30}>
            <ChatPanel recordingId={recordingId} className="h-full" />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </DashboardSidebar>
  );
}

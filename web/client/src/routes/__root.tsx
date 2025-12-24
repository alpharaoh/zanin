import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const RootLayout = () => (
  <TooltipProvider>
    <div className="h-dvh w-dvw">
      <Outlet />
      <Toaster />
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  </TooltipProvider>
);

export const Route = createRootRoute({ component: RootLayout });

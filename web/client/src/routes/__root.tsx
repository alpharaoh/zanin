import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

const RootLayout = () => (
  <div className="h-dvh w-dvw">
    <Outlet />
    <TanStackRouterDevtools position="bottom-right" />
  </div>
);

export const Route = createRootRoute({ component: RootLayout });

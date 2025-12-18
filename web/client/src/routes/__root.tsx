import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

const RootLayout = () => (
  <div className='h-full flex flex-col'>
    <div className="p-2 flex gap-2">
      <Link to="/" className="[&.active]:font-bold">
        Home
      </Link>{" "}
      <Link to="/dashboard" className="[&.active]:font-bold">
        Dashboard
      </Link>{" "}
      <Link to="/sign-in" className="[&.active]:font-bold">
        Sign in
      </Link>
    </div>
    <hr />
    <div className="h-full flex-1 flex">
      <Outlet />
    </div>
    <TanStackRouterDevtools position="bottom-right" />
  </div>
)

export const Route = createRootRoute({ component: RootLayout })

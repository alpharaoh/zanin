import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { LogOutIcon, SettingsIcon } from "lucide-react";
import { type ReactNode } from "react";

interface NavItem {
  title: string;
  url: string;
  icon: ReactNode;
}

interface User {
  name: string;
  email: string;
  image?: string | null;
}

interface DashboardSidebarProps {
  user: User;
  navItems: NavItem[];
  onSignOut: () => void;
  children?: ReactNode;
}

export function DashboardSidebar({
  user,
  navItems,
  onSignOut,
  children,
}: DashboardSidebarProps) {
  const location = useLocation();
  const userInitials = user?.name
    ?.split(" ")
    ?.map((n) => n[0])
    ?.join("")
    ?.toUpperCase()
    ?.slice(0, 2);

  return (
    <div className="flex h-screen w-full">
      {/* Fixed Sidebar */}
      <aside className="flex w-14 flex-col border-r border-border bg-background">
        {/* Navigation */}
        <nav className="flex flex-1 flex-col items-center gap-1 pt-2">
          {navItems.map((item) => {
            const isActive =
              item.url === "/dashboard"
                ? location.pathname === "/dashboard"
                : location.pathname.startsWith(item.url);

            return (
              <Tooltip key={item.title}>
                <TooltipTrigger>
                  <Link
                    to={item.url}
                    className={cn(
                      "flex size-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground",
                      isActive && "bg-primary/10 text-primary"
                    )}
                  >
                    {item.icon}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* User Menu */}
        <div className="flex flex-col items-center pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex size-10 items-center justify-center">
              <Avatar className="size-8">
                {user.image && <AvatarImage src={user.image} alt={user.name} />}
                <AvatarFallback className="bg-card text-[10px]">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 border border-border bg-card"
              side="right"
              align="end"
              sideOffset={8}
            >
              <div className="border-b border-border px-3 py-2">
                <p className="text-xs">{user.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <DropdownMenuGroup className="p-1">
                <DropdownMenuItem
                  render={<Link to="/dashboard/settings" />}
                  className="text-xs"
                >
                  <SettingsIcon className="size-3.5" />
                  settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuGroup className="p-1">
                <DropdownMenuItem
                  onClick={onSignOut}
                  className="text-xs text-muted-foreground focus:text-destructive"
                >
                  <LogOutIcon className="size-3.5" />
                  sign_out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-10 shrink-0 items-center border-b border-border px-4">
          <span className="text-xs text-muted-foreground">zanin</span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

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
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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

interface Organization {
  name: string;
  plan: string;
}

interface DashboardSidebarProps {
  user: User;
  organization: Organization;
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
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarContent className="pt-2">
          <SidebarGroup>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.url === "/dashboard"
                    ? location.pathname === "/dashboard"
                    : location.pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <Link to={item.url}>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isActive}
                        className={cn(
                          "text-muted-foreground transition-colors",
                          isActive && "bg-primary/10 text-primary"
                        )}
                      >
                        {item.icon}
                        <span className="text-xs">{item.title}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton size="lg" className="data-open:bg-card">
                      <Avatar className="size-9">
                        {user.image && (
                          <AvatarImage src={user.image} alt={user.name} />
                        )}
                        <AvatarFallback className="bg-card text-[10px]">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left leading-tight">
                        <span className="truncate text-xs">{user.name}</span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent
                  className="w-56 border border-border bg-card"
                  side="top"
                  align="start"
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
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-10 shrink-0 items-center border-b border-border">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="text-muted-foreground hover:text-primary" />
            <span className="text-xs text-muted-foreground">zanin</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

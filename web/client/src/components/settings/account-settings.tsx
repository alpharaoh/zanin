import { useGetMe } from "@/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/lib/format";
import { LogOutIcon } from "lucide-react";

interface AccountSettingsProps {
  onSignOut: () => void;
  className?: string;
}

export function AccountSettings({
  onSignOut,
  className,
}: AccountSettingsProps) {
  const { data: user, isLoading } = useGetMe();

  if (isLoading) {
    return <AccountSettingsSkeleton className={className} />;
  }

  if (!user?.name) {
    return null;
  }

  const userInitials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn("border border-border", className)}>
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">{">"} account</p>
      </div>

      {/* Profile */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border border-border">
            {user.image && <AvatarImage src={user.image} alt={user.name} />}
            <AvatarFallback className="bg-card text-xs">{userInitials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <dl className="space-y-3 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">organization</dt>
            <dd>{user.organizations[0]?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">email_verified</dt>
            <dd>{user.emailVerified ? "true" : "false"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">member_since</dt>
            <dd>{formatRelativeDate(user.createdAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">user_id</dt>
            <dd className="max-w-[120px] truncate text-muted-foreground">{user.id}</dd>
          </div>
        </dl>
      </div>

      {/* Sign out */}
      <div className="border-t border-border p-4">
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-destructive"
        >
          <LogOutIcon className="size-3.5" />
          sign_out
        </button>
      </div>
    </div>
  );
}

function AccountSettingsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("border border-border", className)}>
      <div className="border-b border-border bg-card px-4 py-3">
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}

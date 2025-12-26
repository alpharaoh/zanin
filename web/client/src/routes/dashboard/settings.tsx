import { AccountSettings } from "@/components/settings/account-settings";
import { VoiceProfile } from "@/components/settings/voice-profile";
import { ApiKeys } from "@/components/settings/api-keys";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "@zanin/auth/client";
import { useCallback } from "react";

function SettingsPage() {
  const navigate = useNavigate();

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    navigate({ to: "/sign-in" });
  }, [navigate]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <span className="text-muted-foreground">~/</span>
        <span className="text-primary">settings</span>
      </div>

      {/* Settings sections */}
      <div className="grid gap-8 lg:grid-cols-2">
        <VoiceProfile />
        <AccountSettings onSignOut={handleSignOut} />
      </div>

      {/* Developer section */}
      <div>
        <p className="mb-4 text-xs text-muted-foreground">{">"} developer</p>
        <ApiKeys />
      </div>

      {/* ASCII decoration */}
      <div className="text-center text-xs text-muted-foreground/30">
        ═══════════════════════════════════════════
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

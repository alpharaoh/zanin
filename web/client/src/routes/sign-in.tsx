import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import SignIn from "@/components/auth/sign-in";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage()  {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (session) {
    navigate({ to: "/dashboard" });
    return undefined;
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-4">
      <SignIn/>
    </div>
  );
};

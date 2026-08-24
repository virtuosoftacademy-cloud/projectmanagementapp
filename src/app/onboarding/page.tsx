import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME } from "@/lib/domain";
import { requireAccount } from "@/lib/session";

export const metadata: Metadata = { title: "Create your workspace" };

/**
 * The one screen reachable while signed in but belonging to no workspace.
 *
 * It sits outside the `(app)` group on purpose: that layout renders the sidebar
 * and loads workspace-scoped data, neither of which exists yet. `requireAccount`
 * rather than `requireUser`, because `requireUser` redirects *here*.
 */
export default async function OnboardingPage() {
  const user = await requireAccount("/onboarding");

  // Already in a workspace — nothing to onboard.
  if (user.workspaceId) redirect("/dashboard");

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            {APP_NAME[0]}
          </span>
          <div>
            <p className="font-semibold leading-tight">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">Set up your workspace</p>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h1 className="text-xl font-bold leading-tight tracking-tight">
                Create your workspace
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Welcome, {user.name.split(" ")[0] || user.email}. Your account isn&apos;t part of a
                workspace yet — create one to get started. You&apos;ll be its owner.
              </p>
            </div>
            <OnboardingForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Expecting an invitation? Ask an owner or admin to add you, then sign in again.
        </p>
      </div>
    </main>
  );
}

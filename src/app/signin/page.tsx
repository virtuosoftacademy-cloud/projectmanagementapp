import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/app/signin/signin-form";
import { Card, CardContent } from "@/components/ui/card";
import { AppLogo } from "@/components/app-logo";
import { getBranding } from "@/lib/queries";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const { from } = await searchParams;
  const branding = await getBranding();
  const target = typeof from === "string" && from.startsWith("/") ? from : "/dashboard";

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <AppLogo branding={branding} />
          <p className="text-xs text-muted-foreground">Project workspace</p>
        </div>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h1 className="text-xl font-bold leading-tight tracking-tight">Sign in</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Use your workspace email and password.
              </p>
            </div>
            <SignInForm from={target} />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Seeded demo accounts use the password from <code className="font-mono">SEED_PASSWORD</code>
          .
        </p>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/app/signin/signin-form";
import { Card, CardContent } from "@/components/ui/card";
import { APP_NAME } from "@/lib/domain";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const { from } = await searchParams;
  const target = typeof from === "string" && from.startsWith("/") ? from : "/dashboard";

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            {APP_NAME[0]}
          </span>
          <div>
            <p className="font-semibold leading-tight">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">Project workspace</p>
          </div>
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

import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PERMISSION_LABELS, roleLabel, type Permission } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Not allowed" };

export default async function ForbiddenPage({ searchParams }: PageProps<"/forbidden">) {
  const user = await getSessionUser();
  const { need } = await searchParams;
  const permission = typeof need === "string" ? (need as Permission) : undefined;
  const label = permission ? PERMISSION_LABELS[permission] : undefined;

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight tracking-tight">
              You don&apos;t have access
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {label ? (
                <>
                  This page needs the <span className="font-medium">{label}</span> permission.
                </>
              ) : (
                "Your role doesn't allow this action."
              )}
              {user ? (
                <>
                  {" "}
                  You&apos;re signed in as {user.name} ({roleLabel(user.role)}).
                </>
              ) : null}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask a workspace owner or admin to change your role, then sign out and back in.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

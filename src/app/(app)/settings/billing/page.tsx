import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSION_LABELS, roleLabel } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Billing" };

/**
 * Billing — a placeholder with a real gate.
 *
 * `billing.manage` is owner-only and was the one permission in the matrix with
 * nothing behind it. This gives it a home and makes the permission enforced
 * rather than merely declared; the plan and payment surface is still to build.
 */
export default async function BillingPage() {
  const viewer = await requirePermission("billing.manage");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight">Billing &amp; plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscription and payment settings for this workspace.
        </p>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Not set up yet</CardTitle>
            <Badge variant="muted">Coming soon</Badge>
          </div>
          <CardDescription>
            There is no plan or payment method attached to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            You can see this page because you hold{" "}
            <span className="font-medium text-foreground">
              {PERMISSION_LABELS["billing.manage"]}
            </span>
            , which only the {roleLabel("owner")} role has — {viewer.name.split(" ")[0]}, that&apos;s
            you. Admins are sent to{" "}
            <Link href="/settings" className="underline hover:text-foreground">
              workspace settings
            </Link>{" "}
            instead.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

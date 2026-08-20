import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, Lock, Users, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminUsers } from "@/lib/admin";
import type { Role } from "@/lib/domain";
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  ROLES,
  can,
  permissionsFor,
  roleLabel,
} from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Roles" };

/** Plain-English summary and swatch per built-in role. */
const ROLE_META: Record<Role, { description: string; color: string }> = {
  owner: {
    description: "Full control, including billing and role management.",
    color: "hsl(var(--primary))",
  },
  admin: {
    description: "Runs the workspace day to day, but cannot manage billing or roles.",
    color: "#a73cdd",
  },
  manager: {
    description: "Leads projects and people without workspace-level settings.",
    color: "#f59f0a",
  },
  member: {
    description: "Does the work: projects, tasks and time tracking.",
    color: "#21c45d",
  },
  viewer: {
    description: "Read-only access, including reports.",
    color: "#1ac3e6",
  },
  guest: {
    description: "Sees projects only — typically an external client.",
    color: "hsl(var(--muted-foreground))",
  },
};

export default async function RolesPage() {
  const viewer = await requirePermission("workspace.settings");
  const users = await getAdminUsers(viewer.workspaceId);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to users
        </Link>
        <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight">Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What each role can do, and who holds it
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ROLES.map((role) => {
          const holders = users.filter((user) => user.role === role);
          const permissions = permissionsFor(role);
          const meta = ROLE_META[role];

          return (
            <Card key={role} className="shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <CardTitle>{roleLabel(role)}</CardTitle>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {holders.length}
                    </Badge>
                    <Badge variant="muted" className="gap-1">
                      <Lock className="h-3 w-3" />
                      System
                    </Badge>
                  </div>
                </div>
                <CardDescription>{meta.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Permissions (<span className="font-mono">{permissions.length}</span>/
                    <span className="font-mono">{PERMISSION_KEYS.length}</span>)
                  </p>
                  <ul className="grid gap-1">
                    {PERMISSION_KEYS.map((permission) => {
                      const granted = can(role, permission);
                      return (
                        <li
                          key={permission}
                          className={
                            granted
                              ? "flex items-center gap-1.5 text-xs"
                              : "flex items-center gap-1.5 text-xs text-muted-foreground/60"
                          }
                        >
                          {granted ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          {PERMISSION_LABELS[permission]}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Members
                  </p>
                  {holders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nobody holds this role.</p>
                  ) : (
                    <ul className="space-y-1">
                      {holders.map((user) => (
                        <li key={user.id} className="flex items-center gap-2">
                          <UserAvatar
                            name={user.name}
                            className="h-6 w-6 bg-primary/10"
                            textClassName="text-[10px] text-primary"
                          />
                          <span className="min-w-0 flex-1 truncate text-xs">{user.name}</span>
                          {!user.active ? (
                            <Badge variant="destructive">Disabled</Badge>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Why roles cannot be edited here</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            These six are built into the schema as a database enum, and the matrix in{" "}
            <code className="font-mono text-xs">lib/permissions.ts</code> is what every
            server-side check reads. Editing a role at runtime would mean storing permissions
            per role in the database — worth doing, but a change to how authorization is
            resolved rather than a screen.
          </p>
          <p>
            To change what someone can reach, change their role on the{" "}
            <Link href="/admin/users" className="underline hover:text-foreground">
              users page
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

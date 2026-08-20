import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import { DangerZone } from "@/components/settings/danger-zone";
import { WorkspaceMembersCard } from "@/components/settings/workspace-members-card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Field } from "@/components/ui/field";
import { getWorkspace } from "@/lib/queries";
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  ROLES,
  can,
  roleLabel,
} from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { listMembers } from "@/lib/users";
import { updateWorkspaceAction } from "./actions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const currentUser = await requirePermission("workspace.settings");
  const [members, workspace] = await Promise.all([
    listMembers(),
    getWorkspace(currentUser.workspaceId),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your workspace and profile</p>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData: FormData) => {
              "use server";
              await updateWorkspaceAction(formData);
            }}
            className="space-y-4"
          >
            <div className="grid gap-4">
              <Field label="Workspace Name">
                <Input name="name" defaultValue={workspace?.name} />
              </Field>
              <Field label="Description">
                <Textarea name="description" defaultValue={workspace?.description} />
              </Field>
            </div>
            <Button type="submit" size="sm">
              Save Workspace
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={currentUser.name}
              className="h-16 w-16 bg-primary/10"
              textClassName="text-lg text-primary"
            />
            <Button variant="outline" size="sm">
              Change avatar
            </Button>
          </div>
          <Separator />
          <div className="grid gap-4">
            <Field label="Display name">
              <Input defaultValue={currentUser.name} />
            </Field>
            <Field label="Email" hint="Email cannot be changed">
              <Input defaultValue={currentUser.email} disabled />
            </Field>
          </div>
          <Button size="sm">Save Changes</Button>
        </CardContent>
      </Card>

      <WorkspaceMembersCard
        members={members}
        canInvite={can(currentUser.role, "members.invite")}
        canManageRoles={can(currentUser.role, "roles.manage")}
        currentUserId={currentUser.id}
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>Role-based access control for this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Permission</th>
                  {ROLES.map((role) => (
                    <th key={role} className="px-3 py-2 text-center font-medium">
                      {roleLabel(role)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {PERMISSION_KEYS.map((permission) => (
                  <tr key={permission} className="border-b">
                    <td className="whitespace-nowrap px-3 py-2">
                      {PERMISSION_LABELS[permission]}
                    </td>
                    {ROLES.map((role) => (
                      <td key={role} className="px-3 py-2">
                        <span className="flex justify-center">
                          {can(role, permission) ? (
                            <Check
                              className="h-4 w-4 text-success"
                              aria-label={`${roleLabel(role)} allowed`}
                            />
                          ) : (
                            <X
                              className="h-4 w-4 text-muted-foreground/50"
                              aria-label={`${roleLabel(role)} denied`}
                            />
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <DangerZone />
    </div>
  );
}
